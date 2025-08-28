const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require("mongoose");
const MongoStore = require("wwebjs-mongo").MongoStore;

const connectDB = require("./database");

// comando !important para marcar mensajes importantes
const fs = require('fs');
const TRABAJOS_FILE = './trabajos.json';

// para que detecet el bot prendido
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot corriendo en Render 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});


let trabajos = [];

try {
    if (fs.existsSync(TRABAJOS_FILE)) {
        const data = fs.readFileSync(TRABAJOS_FILE, 'utf-8');
        trabajos = JSON.parse(data);
    }
    else {
        fs.writeFileSync(TRABAJOS_FILE, JSON.stringify(trabajos, null, 2));
    }

} catch (error) {
    console.error('Error cargando trabajos.json:', error);
}

function guardarTrabajos() {
    try {
        fs.writeFileSync(TRABAJOS_FILE, JSON.stringify(trabajos, null, 2));
    } catch (error) {
        console.error('Error guardando trabajos.json:', error);
    }
}


// conectar a Mongo
connectDB();

// usar MongoStore como auth
const store = new MongoStore({ mongoose });

const client = new Client({
    authStrategy: store,
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('🤖 Bot conectado y listo');
});

client.on('message', msg => {
    console.log('📌 Tu ID es:', msg.author || msg.from);
});


client.on('message', async msg => {
    if (msg.body.startsWith('!everyone')) {
        const chat = await msg.getChat();

        if (!chat.isGroup) {
            msg.reply('❌ Este comando solo se puede usar en grupos.');
            return;
        }

         const isAdmin = await checkIfUserIsAdmin(msg, chat);

        if (!isAdmin) {
            msg.reply('🚫 Solo los administradores pueden usar el comando !everyone.');
            return;
        }

        const command = msg.body.split(' ');
        const customMessage = command.slice(1).join(' ') || '🔔 ¡Atención a todos!';

        const mentions = [];
        let text = `${customMessage}\n`;

        for (let participant of chat.participants) {
            const contact = await client.getContactById(participant.id._serialized);
            mentions.push(contact);
            text += `@${contact.number} `;
        }


        await chat.sendMessage(text, { mentions });
    }
});

async function checkIfUserIsAdmin(msg, chat) {
    try {
        // Obtener el contacto del remitente
        const contact = await msg.getContact();
        const authorId = contact.id._serialized;

        // Buscar al remitente en los participantes del chat
        const sender = chat.participants.find(p => p.id._serialized === authorId);
        
        // Verificar si es admin o superadmin
        const isAdmin = (sender && (sender.isAdmin || sender.isSuperAdmin));
        
        return isAdmin;
        
    } catch (error) {
        console.error('Error en checkIfUserIsAdmin:', error);
        return false; // Por seguridad, si hay error, no es admin
    }
}


client.on('message', async msg => {
    if (msg.body === '!commands') { // Detecta el comando exacto !commands
        const commandList = `
                📜 *Lista de comandos disponibles de GutsBot:*

                1. !everyone 
                → Menciona a todos los miembros del grupo (solo admins).

                2. !commands
                → Muestra esta lista de comandos.

                3. !horarios  ó !horarios [día] 
                → Muestra el horario de los cursos del 4to ciclo turno tarde.

                4. !ping
                → Verifica si el bot está activo.

                5. !important
                → Muestra la lista de trabajos importantes dejados en clase. 
                   5.1 !addimportant <curso>: <detalle>
                   → Agrega un trabajo importante (solo admins).
                   5.2 !delimportant <número>
                   → Elimina un trabajo importante por su número (solo admins).

                
                Escribe el comando directamente.
        `;
        msg.reply(commandList);
    }
});



client.on('message', async msg => {
    const messageBody = msg.body.toLowerCase().trim();
    // Verificar si el mensaje empieza con !horario
    if (messageBody.startsWith('!horario')) {
        // Extraer el día del mensaje
        const parts = messageBody.split(' ');
        
        // Si solo escriben !horario sin especificar día, mostrar todos los horarios
        if (parts.length === 1) {
            const fullScheduleMessage = `
            📅 *Horarios de los cursos del 4to ciclo turno tarde:*

            - *Lunes:*
            - 14:30 - 16:10: Contabilidad y presupuestos
            - 16:10 - 19:30: Análisis de sistemas 
            - 19:30 - 21:10: Sistemas digitales

            - *Martes:*
            - 15:20 - 17:00: Matemática III  
            - 19:30 - 21:10: Modelado Computacional

            - *Miércoles:*
            - 14:30 - 16:10: Modelado Computacional
            - 17:00 - 19:30: Sistemas digitales
            - 19:30 - 21:10: Análisis de sistemas

            - *Jueves:*
            - 13:40 - 16:10: Ingeniería económica
            - 16:10 - 17:50: Matemática III  
            - 17:50 - 19:30: Contabilidad y presupuestos

            - *Viernes:*
            - 15:20 - 17:00: Modelado Computacional
            - 17:00 - 18:40: Ingeniería económica

            📚✨ Para ver un día específico usa: !horario [día]
            `;
            msg.reply(fullScheduleMessage);
            return;
        }
        
        // Obtener el día especificado
        const day = parts[1];
        
        // Definir los horarios por día
        const schedules = {
            'lunes': {
                day: 'Lunes',
                classes: [
                    '14:30 - 16:10: Contabilidad y presupuestos',
                    '16:10 - 19:30: Análisis de sistemas       ',
                    '19:30 - 21:10: Sistemas digitales         '
                ]
            },
            'martes': {
                day: 'Martes',
                classes: [
                    '15:20 - 17:00: Matemática III        ',
                    '19:30 - 21:10: Modelado Computacional'
                ]
            },
            'miercoles': {
                day: 'Miércoles',
                classes: [
                    '14:30 - 16:10: Modelado Computacional',
                    '17:00 - 19:30: Sistemas digitales    ',
                    '19:30 - 21:10: Análisis de sistemas  '
                ]
            },
            'miércoles': {
                day: 'Miércoles',
                classes: [
                    '14:30 - 16:10: Modelado Computacional',
                    '17:00 - 19:30: Sistemas digitales    ',
                    '19:30 - 21:10: Análisis de sistemas  '
                ]
            },
            'jueves': {
                day: 'Jueves',
                classes: [
                    '13:40 - 16:10: Ingeniería económica       ',
                    '16:10 - 17:50: Matemática III             ',
                    '17:50 - 19:30: Contabilidad y presupuestos'
                ]
            },
            'viernes': {
                day: 'Viernes',
                classes: [
                    '15:20 - 17:00: Modelado Computacional',
                    '17:00 - 18:40: Ingeniería económica  '
                ]
            }
        };
        
        // Verificar si el día existe en el horario
        if (schedules[day]) {
            const schedule = schedules[day];
            const dayScheduleMessage = 
            `
                📅 *Horario del ${schedule.day}:*

                ${schedule.classes.map(cls => `  - ${cls}`).join('\n')}

                📚✨
                        `;
                            msg.reply(dayScheduleMessage);
                        } else {
                            // Mensaje de error si el día no es válido
                            const errorMessage = `
                ❌ Día no válido. 

                Usa: !horario [día]
                Días disponibles: lunes, martes, miércoles, jueves, viernes

                Ejemplo: !horario lunes
                            `;
            msg.reply(errorMessage);
        }
    }
});


client.on('message', async msg => {
    if (msg.body === '!ping') {
        msg.reply('Pong! El bot está activo.');
    }
});

client.on('message', async msg => {
    const chat = await msg.getChat();

    // --- Mostrar lista de trabajos ---
    if (msg.body === '!important') {
        if (trabajos.length === 0) {
            msg.reply('✅ Actualmente no hay trabajos pendientes.');
            return;
        }

        let respuesta = '📌 *Trabajos importantes dejados en clase:*\n\n';
        trabajos.forEach((t, i) => {
            respuesta += `${i + 1}. *${t.curso}*: ${t.detalle}\n`;
        });

        msg.reply(respuesta);
    }

    // --- Agregar trabajo (solo admins) ---
    else if (msg.body.startsWith('!addimportant')) {
        const isAdmin = await checkIfUserIsAdmin(msg, chat);

        if (!isAdmin) {
            msg.reply('🚫 Solo los administradores pueden añadir trabajos.');
            return;
        }

        const data = msg.body.replace('!addimportant', '').trim();
        const partes = data.split(':');
        if (partes.length < 2) {
            msg.reply('❌ Formato incorrecto.\nUsa: !addimportant <curso>: <detalle>\nEjemplo: !addimportant Matemáticas: Resolver página 50');
            return;
        }

        const curso = partes[0].trim();
        const detalle = partes.slice(1).join(':').trim();

        trabajos.push({ curso, detalle });
        guardarTrabajos();
        msg.reply(`✅ Trabajo añadido:\n*${curso}*: ${detalle}`);
    }

    // --- Eliminar trabajo (solo admins) ---
    else if (msg.body.startsWith('!delimportant')) {
        const isAdmin = await checkIfUserIsAdmin(msg, chat);

        if (!isAdmin) {
            msg.reply('🚫 Solo los administradores pueden eliminar trabajos.');
            return;
        }

        const index = parseInt(msg.body.replace('!delimportant', '').trim(), 10) - 1;

        if (isNaN(index) || index < 0 || index >= trabajos.length) {
            msg.reply('❌ Número inválido. Usa: !delimportant <número>');
            return;
        }

        const eliminado = trabajos.splice(index, 1);
        guardarTrabajos();
        msg.reply(`🗑 Trabajo eliminado: *${eliminado[0].curso}*`);
    }
});


client.initialize();

// Evita que Railway cierre el proceso
process.stdin.resume();
