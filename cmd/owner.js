// cmd/owner.js
const db = require('../lib/db');
const fs = require('fs'); // Library untuk baca file/folder
const path = require('path');


async function handleOwner(sock, from, command, arg, senderJid) {
    // TAMBAHKAN BARIS INI:
    let target = arg[0] ? arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null;
    switch (command) {
        case 'addgold':
            if (!arg[0] || !arg[1]) return sock.sendMessage(from, { text: '🚩 Format: .addgold @tag jumlah' });
            let targetAdd = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            let amountAdd = parseInt(arg[1]);
            await db.query('UPDATE users SET gold = gold + ? WHERE jid = ?', [amountAdd, targetAdd]);
            await sock.sendMessage(from, { text: `✅ Berhasil menambah ${amountAdd} Gold ke @${targetAdd.split('@')[0]}`, mentions: [targetAdd] });
            break;

        case 'setlevel':
            if (!arg[0] || !arg[1]) return sock.sendMessage(from, { text: '🚩 Format: .setlevel @tag level' });
            let targetLvl = arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            let lvl = parseInt(arg[1]);
            await db.query('UPDATE users SET level = ?, xp = 0 WHERE jid = ?', [lvl, targetLvl]);
            await sock.sendMessage(from, { text: `✅ @${targetLvl.split('@')[0]} sekarang Level ${lvl}`, mentions: [targetLvl] });
            break;

        case 'premium':
            if (!target) return sock.sendMessage(from, { text: '🚩 Format: .premium @tag' });
            // Gunakan UPDATE dengan mematikan case sensitive jika perlu
            const queryPrem = await db.query("UPDATE users SET status = 'premium' WHERE jid = ?", [target]);
            
            if (queryPrem.affectedRows === 0) return sock.sendMessage(from, { text: '❌ Gagal! User tidak ditemukan.' });
            
            await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} sekarang User Premium!`, mentions: [target] });
            break;

        case 'resetallstamina':
            await db.query('UPDATE users SET stamina = 200');
            await sock.sendMessage(from, { text: '✅ Stamina seluruh user telah direset ke 200!' });
            break;
            
        case 'getuser':
            // Definisi target di dalam case atau di awal fungsi handleOwner
            let targetUser = arg[0] ? arg[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null;
            if (!targetUser) return sock.sendMessage(from, { text: '🚩 Tag orangnya!' });

            const [res] = await db.query('SELECT * FROM users WHERE jid = ?', [targetUser]);
            if (!res) return sock.sendMessage(from, { text: '❌ User tidak ditemukan di database.' });
            
            const detail = `📊 *USER DATA DETAILS*\n\n` +
                `• *Name:* ${res.name}\n` +
                `• *Status:* ${res.status}\n` +
                `• *JID:* ${res.jid}\n` +
                `• *Gold:* ${res.gold}\n` +
                `• *Stamina:* ${res.stamina}`;
            await sock.sendMessage(from, { text: detail });
            break;
    
        case 'bc':
        case 'broadcast':
            if (!arg.length) return sock.sendMessage(from, { text: '🚩 Masukkan pesan broadcast!' });
            let allUsers = await db.query('SELECT jid FROM users');
            let bcMsg = `📢 *BROADCAST OWNER*\n\n${arg.join(' ')}`;
            for (let u of allUsers) {
                await sock.sendMessage(u.jid, { text: bcMsg });
            }
            await sock.sendMessage(from, { text: `✅ Berhasil mengirim broadcast ke ${allUsers.length} user.` });
            break;
         case 'stats':
        case 'status':
            const used = process.memoryUsage();
            const ramUsage = `${(used.rss / 1024 / 1024).toFixed(2)} MB`;
            const cpuUsage = process.cpuUsage().system / 1000000;
            await sock.sendMessage(from, { text: `💻 *SYSTEM STATUS*\n\n• *RAM Usage:* ${ramUsage}\n• *CPU Usage:* ${cpuUsage.toFixed(2)}%` });
            break;

        case 'off':
            await sock.sendMessage(from, { text: '⚠️ Bot dimatikan...' });
            process.exit(); 
            break;
        case 'erl':
            try {
                // Kamu bisa membaca file error log jika bot kamu menyimpan log ke file
                // Atau untuk sementara, kita kirimkan pesan status sederhana
                // Jika ingin membaca log terminal real-time, biasanya butuh setup logger (seperti pino/winston)
                const logPath = './bot.log'; // Ganti dengan path log kamu jika ada
                if (fs.existsSync(logPath)) {
                    const logs = fs.readFileSync(logPath, 'utf8').slice(-2000); // Ambil 2000 karakter terakhir
                    await sock.sendMessage(from, { text: `📜 *LAST ERROR LOGS:*\n\n\`\`\`${logs}\`\`\`` });
                } else {
                    await sock.sendMessage(from, { text: 'ℹ️ File bot.log tidak ditemukan. Pastikan bot dijalankan dengan command: node index.js > bot.log 2>&1' });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Gagal baca log: ${e.message}` });
            }
            break;

        case 'sc':
            if (!arg[0]) {
                // Jika tidak ada argumen, tampilkan struktur folder utama
                const files = fs.readdirSync('./');
                let txt = `📂 *STRUCTURE FOLDER*\n\n`;
                files.forEach(file => {
                    if (file !== 'node_modules' && file !== '.git') {
                        const stats = fs.statSync(file);
                        txt += stats.isDirectory() ? `📁 ${file}/\n` : `📄 ${file}\n`;
                    }
                });
                txt += `\n_Ketik .sc [folder/nama_file] untuk masuk/baca_`;
                return await sock.sendMessage(from, { text: txt });
            }

            const inputPath = arg.join(' ');
            if (!fs.existsSync(inputPath)) return sock.sendMessage(from, { text: '🚩 File/Folder tidak ditemukan!' });

            const stats = fs.statSync(inputPath);
            if (stats.isDirectory()) {
                // Jika folder, tampilkan isinya
                const files = fs.readdirSync(inputPath);
                let txt = `📁 *DIRECTORY: ${inputPath}*\n\n`;
                files.forEach(file => {
                    const subStats = fs.statSync(path.join(inputPath, file));
                    txt += subStats.isDirectory() ? `📁 ${file}/\n` : `📄 ${file}\n`;
                });
                await sock.sendMessage(from, { text: txt });
            } else {
                // Jika file, tampilkan isi kodenya (max 4000 char agar tidak kena limit WA)
                const content = fs.readFileSync(inputPath, 'utf8');
                await sock.sendMessage(from, { 
                    text: `📄 *FILE CONTENT: ${inputPath}*\n\n\`\`\`${content.slice(0, 4000)}\`\`\`` 
                });
            }
            break;
            case 'showdb':
            try {
                // 1. Jika tidak ada argumen, tampilkan daftar tabel
                if (!arg[0]) {
                    const tables = await db.query('SHOW TABLES');
                    // Ambil nama tabel dari objek (biasanya key-nya 'Tables_in_nama_db')
                    const tableList = tables.map(t => Object.values(t)[0]);
                    
                    let txt = `🗄️ *DATABASE TABLES*\n\n`;
                    tableList.forEach((name, i) => {
                        txt += `${i + 1}. ${name}\n`;
                    });
                    txt += `\n_Ketik .showdb [nama_tabel] untuk lihat isi_`;
                    return await sock.sendMessage(from, { text: txt });
                }

                // 2. Jika ada argumen, tampilkan 10 data terbaru dari tabel tersebut
                const tableName = arg[0].replace(/[^a-zA-Z0-9_]/g, ''); // Sanitasi nama tabel
                const rows = await db.query(`SELECT * FROM ${tableName} LIMIT 10`);

                if (rows.length === 0) return sock.sendMessage(from, { text: `empty set (0 rows) in ${tableName}` });

                let txt = `📊 *TABLE: ${tableName} (Last 10 Rows)*\n\n`;
                rows.forEach((row, i) => {
                    txt += `*Data #${i + 1}:*\n`;
                    for (let key in row) {
                        txt += ` ➥ *${key}:* ${row[key]}\n`;
                    }
                    txt += `\n`;
                });

                await sock.sendMessage(from, { text: txt.slice(0, 4000) }); // Limit karakter WA
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Database Error: ${e.message}` });
            }
            break;
    }
}

module.exports = { handleOwner };
