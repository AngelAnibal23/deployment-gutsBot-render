// adminValidation 
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


module.exports = { checkIfUserIsAdmin };



