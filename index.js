const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { handleMessage } = require('./cmd/handler');
const fs = require('fs');
const path = require('path');

async function startBot() {
    const authFolder = 'auth_info';
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', async (update) => {
         if(qr) {
   const { QRCodeTerminal } = require('qrcode-terminal'); // pastikan sudah install
   QRCodeTerminal.generate(qr, { small: true });
}
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('Bot is Online!');

            // Logika Berhasil Restart
            if (fs.existsSync('./restart_info.json')) {
                const restartInfo = JSON.parse(fs.readFileSync('./restart_info.json'));
                await sock.sendMessage(restartInfo.from, { 
                    text: `✅ *Bot Berhasil Restart!*\n\n⏱️ Waktu booting: ${((Date.now() - restartInfo.time) / 1000).toFixed(2)} detik.` 
                });
                fs.unlinkSync('./restart_info.json');
            }

            // SAFE AUTO-CLEAN (Hanya hapus sampah, creds.json AMAN)
            const files = fs.readdirSync(authFolder);
            files.forEach(file => {
                if (file !== 'creds.json') { // Filter: Jangan hapus creds.json
                    fs.unlinkSync(path.join(authFolder, file));
                }
            });
            console.log('Cleaned session cache, kept creds.json');
        }

        // Penanganan jika koneksi terputus
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        await handleMessage(sock, m);
    });
}

startBot();
