const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./cmd/handler');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'open') console.log('🚀 BOT ONLINE!');
        if (connection === 'close') startBot();
    });

    sock.ev.on('creds.update', saveCreds);

    // Lempar semua urusan pesan ke handler.js
    sock.ev.on('messages.upsert', async m => {
        await handleMessage(sock, m);
    });
}

startBot();
