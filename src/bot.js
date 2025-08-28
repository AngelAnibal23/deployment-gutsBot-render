const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { BotState, logActivity } = require('./database');
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

  async shouldAutoStart() {
    try {
      const timeDiff = (new Date() - this.botState.lastActivity) / (1000 * 60);
      return this.botState.isAuthenticated && timeDiff < 60;
    } catch (error) {
      return false;
    }
  }

  async initializeClient() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });

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
    });

    this.client.on('authenticated', async () => {
      console.log('✅ Autenticado');
      await this.updateBotState({ isAuthenticated: true });
    });

    this.client.on('auth_failure', async (msg) => {
      console.error('❌ Fallo autenticación:', msg);
      await this.updateBotState({ isAuthenticated: false, isActive: false });
    });

    this.client.on('disconnected', async (reason) => {
      console.log('⚠️ Desconectado:', reason);
      await this.updateBotState({ isActive: false });
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