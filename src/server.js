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
            const base64QrCode = Buffer.from(state.qrCode).toString('base64');
            
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp QR Code</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <!-- Usar davidshimjs-qrcodejs desde jsDelivr -->
                <script src="https://cdn.jsdelivr.net/npm/davidshimjs-qrcodejs@0.0.2/qrcode.min.js"></script>
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
                    #qrcode { 
                        margin: 20px 0; 
                        min-height: 300px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 2px dashed #ddd;
                        border-radius: 10px;
                    }
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
                    .loading {
                        color: #666;
                        font-size: 16px;
                    }
                    .error {
                        color: #d32f2f;
                        background: #ffebee;
                        padding: 10px;
                        border-radius: 5px;
                        margin: 10px 0;
                    }
                    .qr-data {
                        font-size: 10px;
                        color: #999;
                        word-break: break-all;
                        margin-top: 10px;
                        max-height: 50px;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>🤖 WhatsApp Bot</h2>
                    <div class="status">
                        ✅ Bot ejecutándose - Listo para escanear
                    </div>
                    <div id="qrcode">
                        <div class="loading">⏳ Generando código QR...</div>
                    </div>
                    <div class="instructions">
                        📱 <strong>Instrucciones:</strong><br>
                        1. Abre WhatsApp en tu teléfono<br>
                        2. Ve a Configuración → Dispositivos vinculados<br>
                        3. Toca "Vincular un dispositivo"<br>
                        4. Escanea este código QR
                    </div>
                    <button class="refresh-btn" onclick="location.reload()">🔄 Actualizar QR</button>
                    
                    <div class="qr-data">
                        Datos QR: ${state.qrCode.substring(0, 50)}...
                    </div>
                </div>
                
                <script>
                    console.log('Iniciando generación de QR con davidshimjs-qrcodejs...');
                    
                    // Decodificar desde Base64
                    const qrString = window.atob('${base64QrCode}');
                    const qrContainer = document.getElementById('qrcode');
                    
                    console.log('QR String length:', qrString.length);
                    console.log('QR String preview:', qrString.substring(0, 50));
                    
                    // Verificar si la librería se cargó correctamente
                    if (typeof QRCode === 'undefined') {
                        console.error('Librería QRCode no cargada');
                        showError('No se pudo cargar la librería QR');
                    } else {
                        console.log('Librería QRCode cargada correctamente');
                        console.log('QRCode disponible:', QRCode);
                        
                        // Limpiar el contenedor
                        qrContainer.innerHTML = '';
                        
                        // Crear el QR code con la API correcta de davidshimjs-qrcodejs
                        try {
                            new QRCode(qrContainer, {
                                text: qrString,
                                width: 280,
                                height: 280,
                                colorDark: '#000000',
                                colorLight: '#FFFFFF',
                                correctLevel: QRCode.CorrectLevel.M
                            });
                            
                            console.log('QR code generado exitosamente');
                            
                        } catch (error) {
                            console.error('Error generando QR:', error);
                            showError('Error: ' + error.message);
                        }
                    }
                    
                    function showError(message) {
                        qrContainer.innerHTML = \`
                            <div class="error">
                                ❌ \${message}<br>
                                <small>Intenta actualizar la página</small>
                            </div>
                        \`;
                    }
                    
                    // Auto-refresh cada 45 segundos
                    setTimeout(() => {
                        console.log('Auto-refresh...');
                        location.reload();
                    }, 45000);
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

    if (process.env.RENDER === 'true') {
      startKeepAlive();
    }
  });

  return server;
}

// Función keep-alive mejorada
function startKeepAlive() {
  const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}`;
  let consecutiveFailures = 0;
  const maxFailures = 3;
  
  console.log('🔧 Iniciando keep-alive para Render...');
  
  // Ping cada 9 minutos (540000 ms) - menos de 10 para mayor seguridad
  setInterval(async () => {
    try {
      const response = await fetch(`${url}/health`);
      
      if (response.ok) {
        console.log(`✅ Keep-alive exitoso: ${new Date().toLocaleTimeString()}`);
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
        console.log(`⚠️ Keep-alive respondió con error: ${response.status}`);
      }
    } catch (error) {
      consecutiveFailures++;
      console.log('❌ Keep-alive falló:', error.message);
      
      // Si falla múltiples veces, podría indicar un problema serio
      if (consecutiveFailures >= maxFailures) {
        console.log('🆘 Múltiples fallos en keep-alive. Verificar estado de la app.');
      }
    }
  }, 9 * 60 * 1000); // 9 minutos
}

module.exports = { createWebServer };