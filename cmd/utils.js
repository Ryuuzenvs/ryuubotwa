// cmd/utils.js
const { exec } = require('child_process');

async function handleUtils(sock, from, command, arg, msg, isOwner, isGroupAdmins, isBotAdmin) {
    const q = msg.messages[0];
    
    switch (command) {
        case 'd':
        case 'del':
        case 'delete':
            // Cek apakah ada pesan yang di-reply
            const quoted = q.message.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) return sock.sendMessage(from, { text: '🚩 Balas pesan yang ingin dihapus!' });

            // Logika Otoritas
            if (!isOwner && !isGroupAdmins) return sock.sendMessage(from, { text: '❌ Hanya Admin atau Owner yang bisa hapus pesan!' });
            if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot harus jadi Admin agar bisa menghapus pesan orang lain!' });

            const key = {
                remoteJid: from,
                fromMe: q.message.extendedTextMessage.contextInfo.participant === sock.user.id,
                id: q.message.extendedTextMessage.contextInfo.stanzaId,
                participant: q.message.extendedTextMessage.contextInfo.participant
            };

            await sock.sendMessage(from, { delete: key });
            break;
    }
}

module.exports = { handleUtils };
