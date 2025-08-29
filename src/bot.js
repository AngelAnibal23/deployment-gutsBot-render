const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { BotState, SessionData, logActivity } = require('./database');
const { handleMessage } = require('./messageHandler');
const fs = require('fs').promises;
const path = require('path');

const IS_RENDER = process.env.RENDER === 'true';

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.botState = null;
    this.sessionDir = IS_RENDER ? '/tmp/wwebjs_auth' : './wwebjs_auth';
  }

  async start() {
    try {
      console.log('🔧 Configurando WhatsApp client...');
      
      // Obtener estado del bot
      await this.getBotState();
      
      // Verificar auto-inicio
      const shouldStart = await this.shouldAutoStart();
      console.log(`🔍 Auto-inicio: ${shouldStart ? 'SÍ' : 'NO'}`);
      
      // Inicializar cliente
      await this.initializeClient();
      
      // Iniciar cliente
      await this.client.initialize();
      
    } catch (error) {
      console.error('❌ Error iniciando bot:', error);
      await logActivity('error', 'Error iniciando bot', { error: error.message });
      throw error;
    }
  }

  async getBotState() {
    try {
      let state = await BotState.findOne({ sessionId: 'main' });
      if (!state) {
        state = new BotState({ sessionId: 'main' });
        await state.save();
      }
      this.botState = state;
      return state;
    } catch (error) {
      throw new Error(`Error obteniendo estado: ${error.message}`);
    }
  }

  async updateBotState(updates) {
    try {
      if (this.botState) {
        Object.assign(this.botState, updates);
        this.botState.lastActivity = new Date();
        await this.botState.save();
      }
    } catch (error) {
      await logActivity('error', 'Error actualizando estado', { error: error.message });
    }
  }

  // NUEVA función: Guardar sesión en MongoDB
  async saveSessionToMongoDB() {
    try {
      const sessionPath = path.join(this.sessionDir, 'session-main');
      
      // Verificar si existe el archivo de sesión
      try {
        await fs.access(sessionPath);
        console.log('📁 Archivo de sesión encontrado, guardando en MongoDB...');
        
        const authData = await fs.readFile(sessionPath, 'utf8');
        
        await SessionData.findOneAndUpdate(
          { sessionId: 'main' },
          { 
            authData: authData,
            lastSync: new Date(),
            environment: IS_RENDER ? 'render' : 'local'
          },
          { upsert: true }
        );
        
        await logActivity('info', 'Sesión guardada en MongoDB', { 
          environment: IS_RENDER ? 'render' : 'local',
          dataLength: authData.length 
        });
        
      } catch (fileError) {
        console.log('📁 No hay archivo de sesión para guardar aún');
      }
    } catch (error) {
      await logActivity('error', 'Error guardando sesión en MongoDB', { error: error.message });
    }
  }

  // NUEVA función: Restaurar sesión desde MongoDB
  async restoreSessionFromMongoDB() {
    try {
      const sessionDoc = await SessionData.findOne({ sessionId: 'main' });
      
      if (!sessionDoc || !sessionDoc.authData) {
        console.log('📂 No hay sesión guardada en MongoDB');
        return false;
      }

      // Crear directorio si no existe
      await fs.mkdir(this.sessionDir, { recursive: true });
      
      const sessionPath = path.join(this.sessionDir, 'session-main');
      await fs.writeFile(sessionPath, sessionDoc.authData);
      
      console.log('✅ Sesión restaurada desde MongoDB');
      await logActivity('info', 'Sesión restaurada desde MongoDB', { 
        fromEnvironment: sessionDoc.environment,
        currentEnvironment: IS_RENDER ? 'render' : 'local',
        lastSync: sessionDoc.lastSync
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error restaurando sesión:', error.message);
      await logActivity('error', 'Error restaurando sesión desde MongoDB', { error: error.message });
      return false;
    }
  }

  async shouldAutoStart() {
    try {
      // 1. Verificar estado del bot
      const timeDiff = (new Date() - this.botState.lastActivity) / (1000 * 60);
      const botWasAuthenticated = this.botState.isAuthenticated;
      
      // 2. Verificar si hay sesión en MongoDB
      const hasSessionInMongoDB = await SessionData.findOne({ 
        sessionId: 'main', 
        authData: { $ne: null } 
      });
      
      // 3. Auto-iniciar si:
      // - Hay sesión guardada en MongoDB, O
      // - El bot estaba autenticado y no ha pasado mucho tiempo
      const shouldStart = hasSessionInMongoDB || (botWasAuthenticated && timeDiff < 120);
      
      await logActivity('info', 'Verificación de auto-inicio', {
        shouldStart,
        botWasAuthenticated,
        timeSinceLastActivity: timeDiff,
        hasSessionInMongoDB: !!hasSessionInMongoDB,
        environment: IS_RENDER ? 'render' : 'local'
      });
      
      return shouldStart;
    } catch (error) {
      await logActivity('error', 'Error en shouldAutoStart', { error: error.message });
      return false;
    }
  }

  async initializeClient() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });

      // INTENTAR RESTAURAR SESIÓN ANTES DE CREAR EL CLIENTE
      await this.restoreSessionFromMongoDB();

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'whatsapp-bot-main',
          dataPath: this.sessionDir
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      this.setupEventListeners();
      
    } catch (error) {
      throw new Error(`Error inicializando cliente: ${error.message}`);
    }
  }

  setupEventListeners() {
    this.client.on('qr', async (qr) => {
      console.log('🔍 Código QR generado');
      if (!IS_RENDER) {
        qrcode.generate(qr, { small: true });
      } else {
        console.log('📱 Obtén el QR en: https://tu-app.onrender.com/qr');
      }
      await this.updateBotState({ qrCode: qr, isAuthenticated: false });
    });

    this.client.on('ready', async () => {
      console.log('✅ Bot listo!');
      const clientInfo = this.client.info;
      await this.updateBotState({ 
        isActive: true, 
        isAuthenticated: true,
        phoneNumber: clientInfo.wid.user,
        qrCode: null 
      });
      this.isInitialized = true;
      
      // GUARDAR SESIÓN DESPUÉS DE ESTAR LISTO
      setTimeout(() => this.saveSessionToMongoDB(), 3000);
    });

    this.client.on('authenticated', async () => {
      console.log('✅ Autenticado');
      await this.updateBotState({ isAuthenticated: true });
      
      // GUARDAR SESIÓN CUANDO SE AUTENTICA
      setTimeout(() => this.saveSessionToMongoDB(), 2000);
    });

    this.client.on('auth_failure', async (msg) => {
      console.error('❌ Fallo autenticación:', msg);
      await this.updateBotState({ isAuthenticated: false, isActive: false });
      
      // LIMPIAR SESIÓN CORRUPTA
      try {
        await SessionData.findOneAndDelete({ sessionId: 'main' });
        console.log('🗑️ Sesión corrupta eliminada de MongoDB');
      } catch (error) {
        console.error('Error eliminando sesión corrupta:', error.message);
      }
    });

    this.client.on('disconnected', async (reason) => {
      console.log('⚠️ Desconectado:', reason);
      await this.updateBotState({ isActive: false });
      
      // Si la desconexión fue por logout, limpiar sesión
      if (reason === 'LOGOUT') {
        try {
          await SessionData.findOneAndDelete({ sessionId: 'main' });
          console.log('🗑️ Sesión eliminada por logout');
        } catch (error) {
          console.error('Error eliminando sesión:', error.message);
        }
      }
    });

    this.client.on('message', async (message) => {
      await handleMessage(message, this);
    });

    this.client.on('error', async (error) => {
      console.error('❌ Error cliente:', error);
      await logActivity('error', 'Error del cliente', { error: error.message });
    });
  }

  async stop() {
    try {
      if (this.client) {
        await this.client.destroy();
      }
      await this.updateBotState({ isActive: false });
      console.log('✅ Bot detenido');
    } catch (error) {
      console.error('❌ Error deteniendo bot:', error);
    }
  }
}

module.exports = WhatsAppBot;