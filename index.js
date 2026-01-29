const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { handleMessage } = require('./cmd/handler');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode-terminal'); // Pastikan sudah npm install qrcode-terminal

async function startBot() {
    const authFolder = 'auth_info';
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Kita handle manual di bawah
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Tampilkan QR Code jika ada
        if (qr) {
            QRCode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log('✅ Bot is Online!');

            // Logika Berhasil Restart
            if (fs.existsSync('./restart_info.json')) {
                try {
                    const restartInfo = JSON.parse(fs.readFileSync('./restart_info.json'));
                    await sock.sendMessage(restartInfo.from, { 
                        text: `✅ *Bot Berhasil Restart!*\n\n⏱️ Waktu booting: ${((Date.now() - restartInfo.time) / 1000).toFixed(2)} detik.` 
                    });
                    fs.unlinkSync('./restart_info.json');
                } catch (e) { console.error("Error sending restart message", e); }
            }
            
            // --- JANGAN HAPUS FILE DI AUTH FOLDER ---
            // Baileys mengelola file-file di auth_info secara otomatis. 
            // Menghapusnya secara manual akan merusak enkripsi pesan.
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`❌ Connection closed. Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('⚠️ Session Logged Out. Silahkan hapus folder auth_info dan scan ulang.');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        // Tambahkan pengaman agar tidak memproses pesan kosong
        if (!m.messages[0].message) return;
        await handleMessage(sock, m);
    });
}

startBot();
