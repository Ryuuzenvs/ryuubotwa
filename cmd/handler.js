const db = require('../lib/db');
const { tttBoard, checkWinner, generateBomBoard } = require('../lib/games');
const { handleOwner } = require('./owner'); // Import file owner
const { handleGenshin } = require('./genshin'); // Import file genshin
const { rollDice } = require('../commands/games'); // Import modular dadu
const { fetchImage } = require('../lib/downloader'); // lib/downloader
const { handleUtils } = require('./utils'); // Import file utils
const { handleGachaSim } = require('../commands/gachaHandler');
const axios = require('axios');
const botRateLimit = new Map(); 
const botMute = new Map();
const cooldowns = new Map();
const OWNER_NUMBER = '149392535371809';
const prefix = '.';
const sessionGame = new Map(); // Untuk menyimpan status game aktif
let botIsMuted = false;

async function handleMessage(sock, m) {
let body = ""
    try {
const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const pushName = msg.pushName || 'Player';       

        const decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) return jid.split(':')[0] + '@' + jid.split('@')[1];
            return jid.replace('@lid', '@s.whatsapp.net');
        };

        const senderJid = decodeJid(msg.key.participant || from);
        const senderNumber = senderJid.split('@')[0];
        const isOwner = senderNumber === OWNER_NUMBER;

        // Pastikan body selalu string
        // Mendapatkan teks dari berbagai jenis pesan
        body = (
            msg.message.conversation || 
            msg.message.extendedTextMessage?.text || 
            msg.message.imageMessage?.caption || 
            msg.message.videoMessage?.caption || 
            ""
        ).trim();

        const isCmd = body.startsWith(prefix);
        const arg = isCmd ? body.slice(prefix.length).trim().split(/ +/g) : [];
        const command = isCmd ? arg.shift().toLowerCase() : '';

        // --- LOGIC ON/OFF ---
        if (command === 'on' && isOwner) {
            botIsMuted = false;
            return await sock.sendMessage(from, { text: '⏰ Bot kembali aktif!' });
        }
        if (command === 'off' && isOwner) {
            botIsMuted = true;
            return await sock.sendMessage(from, { text: `💤 Bot sleep. Gunakan ${prefix}on untuk membangunkan.` });
        }

        if (botIsMuted && !isOwner) return;

        // --- RATE LIMITER ---
        if (botMute.has(from) && Date.now() < botMute.get(from)) return;
        let rate = botRateLimit.get(from) || { count: 0, lastTime: Date.now() };
        
        if (Date.now() - rate.lastTime < 1000) {
            rate.count++;
        } else {
            rate.count = 1;
            rate.lastTime = Date.now();
        }
        botRateLimit.set(from, rate);

        if (rate.count > 3) {
            botMute.set(from, Date.now() + 10000); // Mute 10 detik
            return sock.sendMessage(from, { text: "⚠️ *Bot Terlalu Cepat!* Cooldown 10 detik agar tidak spam." });
        }
        // --- 1. LOGIC PENANGKAP GAME ---
if (sessionGame.has(from) && !isCmd && body.length > 0) {
            const game = sessionGame.get(from);
            const guess = parseInt(body);

            if (game.lastAction && Date.now() - game.lastAction > 60000) {
                sessionGame.delete(from);
                return sock.sendMessage(from, { text: "⏳ Waktu habis! Game dihentikan." });
            }
            game.lastAction = Date.now();

            if (game.type === 'bom' && game.player === senderJid) {
                if (!isNaN(guess) && guess >= 1 && guess <= 9) {
                    if (guess === game.bomb) {
                        await sock.sendMessage(from, { text: `💥 *BOOOM!* @${senderNumber} kena bom!`, mentions: [senderJid] });
                        await db.query('UPDATE users SET gold = GREATEST(gold - 50, 0) WHERE jid = ?', [senderJid]);
                        sessionGame.delete(from);
                    } else if (game.revealed.includes(guess)) {
                        await sock.sendMessage(from, { text: `⚠️ Angka ${guess} sudah dibuka!` });
                    } else {
                        game.revealed.push(guess);
                        if (game.revealed.length === 8) {
                            await sock.sendMessage(from, { text: `🎊 *MENANG!* Gold +100`, mentions: [senderJid] });
                            await db.query('UPDATE users SET gold = gold + 100 WHERE jid = ?', [senderJid]);
                            sessionGame.delete(from);
                        } else {
                            await sock.sendMessage(from, { text: `✅ Aman!\n\n${generateBomBoard(game.revealed)}` });
                        }
                    }
                }
                return;
            }
            
            if (game.type === 'gachasim' && game.player === senderJid) {
            return await handleGachaSim(sock, from, body, sessionGame, senderJid, senderNumber);
            }

            // B. LOGIKA TIC TAC TOE (TTT)
            if (game.type === 'ttt') {
                // Bergabung otomatis jika slot masih 1
                if (game.player.length < 2 && senderJid !== game.player[0]) {
                    game.player.push(senderJid);
                    await sock.sendMessage(from, { text: `✅ @${senderNumber} bergabung sebagai Player 2 (⭕)`, mentions: [senderJid] });
                }

                // Validasi Giliran
                const currentPlayerJid = game.player[game.turn];
                if (senderJid !== currentPlayerJid) return; 

                if (!isNaN(guess) && guess >= 1 && guess <= 9) {
                    const index = guess - 1;
                    if (game.board[index] === '❌' || game.board[index] === '⭕') return;

                    game.board[index] = game.symbols[game.turn];
                    const winner = checkWinner(game.board);

                    if (winner) {
                        let resultText = winner === 'seri' ? "🤝 Hasil SERI!" : `🎉 @${senderNumber} MENANG! (+200 Gold)`;
                        if (winner !== 'seri') await db.query('UPDATE users SET gold = gold + 200 WHERE jid = ?', [senderJid]);
                        
                        await sock.sendMessage(from, { text: `${resultText}\n\n${tttBoard(game.board)}`, mentions: [senderJid] });
                        sessionGame.delete(from);
                    } else {
                        game.turn = game.turn === 0 ? 1 : 0;
                        const nextPlayer = game.player[game.turn];
                        await sock.sendMessage(from, { 
                            text: `🎮 *TIC TAC TOE*\nGiliran: @${nextPlayer.split('@')[0]}\n\n${tttBoard(game.board)}`, 
                            mentions: [nextPlayer] 
                        });
                    }
                }
                return;
            }
            
            // --- LOGIKA TEBAK GENSHIN ---
        // LOGIKA TEBAK GENSHIN
            if (game.type === 'genshin') {
                if (game.players.length < 4 && !game.players.includes(senderJid)) {
                    game.players.push(senderJid);
                }

                if (game.players.includes(senderJid)) {
                    const userGuess = body.toLowerCase().trim();
                    
                    if (userGuess === game.answer.toLowerCase()) {
                        await sock.sendMessage(from, { text: `🎊 *TEBAKAN BENAR!* \n\nJawaban: *${game.answer}*\nPemenang: @${senderNumber}`, mentions: [senderJid] });
                        await db.query('UPDATE users SET gold = gold + 250 WHERE jid = ?', [senderJid]);
                        sessionGame.delete(from);
                        return;
                    } else {
                        // Agar tidak spam jika user ngetik random/iseng, kita batasi salahnya
                        game.wrongCount += 1;
                        if (game.revealedClues < 6) {
                            game.revealedClues += 1;
                        }
                        
                        const d = game.fullData;
                        const clues = [
                            `📍 Region: ${d.region}`,
                            `✨ Element: ${d.element}`,
                            `⚔️ Weapon: ${d.weapon}`,
                            `⭐ Rarity: ${d.rarity} Star`,
                            `👤 Gender: ${d.gender}`,
                            `📏 Body: ${d.body_type}`
                        ];

                        let txt = `❌ *SALAH!* (@${senderNumber})\n\n`;
                        txt += `🔍 *CLUE TERBUKA (${game.revealedClues}/6):*\n`;
                        for (let i = 0; i < game.revealedClues; i++) {
                            txt += `➥ ${clues[i]}\n`;
                        }
                        
                        await sock.sendMessage(from, { text: txt, mentions: [senderJid] });
                        return;
                    }
                }
            }
        }

        // --- 4. COMMAND ROUTER (Hanya jika ada prefix) ---
        if (!isCmd) return;
        /// --- 2. AUTO REGISTER & DATA FETCH ---
        let user = await db.query('SELECT * FROM users WHERE jid = ?', [senderJid]);
        
        if (user.length === 0) {
            // Pastikan status tidak null sebelum insert
            const initialStatus = (senderNumber === OWNER_NUMBER) ? 'owner' : 'gratisan';
            
            await db.query(
                'INSERT INTO users (id, jid, name, status, gold, stamina, level, xp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                [senderNumber, senderJid, pushName, initialStatus, 100, 200, 1, 0]
            );
            
            await sock.sendMessage(from, { text: `👋 Halo *${pushName}*, kamu telah terdaftar otomatis!` });
            user = await db.query('SELECT * FROM users WHERE jid = ?', [senderJid]);
        }
        
        const userData = user[0];
        // Double safety: jika di DB null, variabel di bawah ini tetap punya string
        const uStatus = (userData.status || "gratisan").toUpperCase();
        const uName = userData.name || "Player";

        // Helper: Potong Stamina
        const useStamina = async (amount) => {
            if (userData.stamina < amount) {
                await sock.sendMessage(from, { text: `⚡ Stamina tidak cukup (Min. ${amount}).\nKetik ${prefix}daily untuk reset.` });
                return false;
            }
            return true;
        };

        // --- MASUKKAN LOGIKA OWNER DI SINI ---
const ownerCommands = ['addgold', 'setlevel', 'premium', 'resetallstamina', 'bc', 'broadcast', 'getuser', 'status', 'offterm', 'stats', 'erl', 'sc', 'showdb','restart', 'groups', 'statschat', 'br','log'];
        if (ownerCommands.includes(command)) {
            if (!isOwner) return sock.sendMessage(from, { text: '❌ Fitur ini hanya untuk Owner!' });
            return await handleOwner(sock, from, command, arg, senderJid);
        }
                
        //chek user role
        const groupMetadata = from.endsWith('@g.us') ? await sock.groupMetadata(from) : null;
        const participants = groupMetadata ? groupMetadata.participants : [];
        const isBotAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin !== null;
        const isGroupAdmins = participants.find(p => p.id === senderJid)?.admin !== null;

        // --- 3. COMMAND ROUTER ---
        switch (command) {
            case 'menu':
                // 1. Deklarasi awal teks menu
                let menuTxt = `┏━━━『 𝕽𝕻𝕲 𝕭𝕺𝕿 𝕷𝕴𝕿𝕰 』━━━┓\n┃\n` +
                    `┃ 👋 Halo, *${userData.name}*!\n` +
                    `┃ 🛡️ Status: _${userData.status.toUpperCase()}_ \n┃\n` +
                    `┣━━『 👤 USER INFO 』\n` +
                    `┃ ➥ ${prefix}profile\n` +
                    `┃ ➥ ${prefix}lb / leaderboard\n` +
                    `┃ ➥ ${prefix}owner\n┃\n` +
                    `┣━━『 ⚔️ RPG GAMES 』\n` +
                    `┃ ➥ ${prefix}hunt (10⚡)\n` +
                    `┃ ➥ ${prefix}bom (10⚡)\n` +
                    `┃ ➥ ${prefix}ttt (10⚡)\n` +
                    `┃ ➥ ${prefix}tictactoe (10⚡)\n` +
                    `┃ ➥ ${prefix}ping (Cek Speed)\n┃\n` +
                    `┣━━『 ⚔️ HOYO GAMES 』\n` +
                    `┃ ➥ ${prefix}tebakgenshin (10⚡)\n` +
                    `┃ ➥ ${prefix}gachasim (10⚡)\n` +
                    `┃ ➥ ${prefix}allgenshin (list karakter di database)\n┃\n` +
                    `┣━━『 🛠️ UTILITIES 』\n` +
                    `┃ ➥ ${prefix}rv (Read ViewOnce)\n` +
                    `┃ ➥ ${prefix}d\n` +
                    `┃ ➥ ${prefix}del\n` +
                    `┃ ➥ ${prefix}delete\n` +
                    `┃ ➥ ${prefix}pictba\n┃\n` +
                    `┣━━『 🎒 BACKPACK 』\n` +
                    `┃ ➥ ${prefix}daily\n┃`; // Perhatikan titik koma di sini penting

                // 2. Tambahan logika jika Owner
                if (isOwner) {
                    menuTxt += `┣━━『 👨‍💻 OWNER PANEL 』\n` +
                        `┃ ➥ ${prefix}stats (RAM/CPU)\n` +
                        `┃ ➥ ${prefix}off (Matikan Bot)\n` +
                        `┃ ➥ ${prefix}getuser @tag\n` +
                        `┃ ➥ ${prefix}addgold @tag qty\n` +
                        `┃ ➥ ${prefix}setlevel @tag lvl\n` +
                        `┃ ➥ ${prefix}premium @tag\n` +
                        `┃ ➥ ${prefix}resetallstamina\n` +
                        `┃ ➥ ${prefix}bc (pesan)\n`+
                        `┃ ➥ ${prefix}sc\n`+
                        `┃ ➥ ${prefix}restart\n`+
                        `┃ ➥ ${prefix}groups\n`+
                        `┃ ➥ ${prefix}statschat\n`+
                        `┃ ➥ ${prefix}erl\n`+
                        `┃ ➥ ${prefix}log\n`+
                        `┃ ➥ ${prefix}br\n`+
                        `┃ ➥ ${prefix}showdb\n`;
                }

                // 3. Penutup
                menuTxt += `┗━━━━━━━━━━━━━━━━━━━━━━━┛`;
                
                await sock.sendMessage(from, { text: menuTxt, mentions: [senderJid] });
                break;

            case 'ping':
                const start = Date.now();
                await sock.sendMessage(from, { text: 'Menghitung speed...' });
                const end = Date.now();
                await sock.sendMessage(from, { text: `🚀 *Response Speed:* ${end - start}ms` });
                break;

            case 'rv':
            case 'rvo':
                const q = m.messages[0].message.extendedTextMessage?.contextInfo?.quotedMessage;
                // Cek semua kemungkinan struktur View Once
                const viewOnce = q?.viewOnceMessageV2 || q?.viewOnceMessage || q?.viewOnceMessageV2Extension;
                
                if (!viewOnce) return sock.sendMessage(from, { text: '🚩 Balas (reply) pesan yang sekali lihat!' });

                // Dapatkan pesan aslinya
                const content = viewOnce.message;
                const typeMsg = Object.keys(content)[0]; // imageMessage atau videoMessage

                await sock.sendMessage(from, { 
                    forward: { 
                        key: m.messages[0].message.extendedTextMessage.contextInfo.stanzaId, 
                        message: content 
                    } 
                }, { quoted: m.messages[0] });
                break;

            case 'profile':
                const profileTxt = `👤 *USER PROFILE*\n\n` +
                    `• *Nama:* ${userData.name}\n• *ID:* ${userData.id}\n• *Status:* ${userData.status}\n` +
                    `• *Level:* ${userData.level}\n• *XP:* ${userData.xp}/${userData.level * 100}\n` +
                    `• *Gold:* ${userData.gold.toLocaleString()}\n• *Stamina:* ${userData.stamina} ⚡`;
                await sock.sendMessage(from, { text: profileTxt });
                break;

            case 'bom':
                if (sessionGame.has(from)) return sock.sendMessage(from, { text: 'Selesaikan game yang ada dulu!' });
                if (!(await useStamina(10))) return;
                
                sessionGame.set(from, {
                    type: 'bom',
                    player: senderJid,
                    bomb: Math.floor(Math.random() * 9) + 1,
                    revealed: []
                });

                await db.query('UPDATE users SET stamina = stamina - 10 WHERE jid = ?', [senderJid]);
                await sock.sendMessage(from, { text: `💣 *TEBAK BOM*\n\nAda 1 bom di angka 1-9.\nKetik angka langsung untuk membuka!\n\n${generateBomBoard([])}` });
                break;

            case 'hunt':
                if (!(await useStamina(10))) return;
                const mXp = Math.floor(Math.random() * 25) + 15;
                const mGold = Math.floor(Math.random() * 60) + 20;
                let { xp, level } = userData;
                xp += mXp;
                if (xp >= level * 100) {
                    level++; xp = 0;
                    await db.query('UPDATE users SET level = ?, xp = ?, stamina = 200, gold = gold + ? WHERE jid = ?', [level, xp, 500, senderJid]);
                    await sock.sendMessage(from, { text: `🎊 *LEVEL UP!* Sekarang level *${level}*!` });
                } else {
                    await db.query('UPDATE users SET xp = ?, gold = gold + ?, stamina = stamina - 10 WHERE jid = ?', [xp, mGold, senderJid]);
                }
                await sock.sendMessage(from, { text: `⚔️ *Hunt Berhasil!*\n✨ XP: +${mXp}\n💰 Gold: +${mGold}\n⚡ Stamina: -10` });
                break;

            case 'daily':
                const now = new Date();
                if (userData.last_daily && (now - new Date(userData.last_daily) < 24 * 60 * 60 * 1000)) return sock.sendMessage(from, { text: '🎁 Cek lagi besok!' });
                await db.query('UPDATE users SET stamina = 200, gold = gold + 500, last_daily = NOW() WHERE jid = ?', [senderJid]);
                await sock.sendMessage(from, { text: '🎁 *Daily Claimed!*\n⚡ Stamina Reset: 200\n💰 Gold: +500' });
                break;

            case 'owner':
                await sock.sendMessage(from, { text: `👨‍💻 *OWNER:* wa.me/6285809839062` });
                break;
            case 'gachasim':
        return await handleGachaSim(sock, from, body, sessionGame, senderJid, senderNumber);
    
            case 'ttt':
            case 'tictactoe':
                if (sessionGame.has(from)) return sock.sendMessage(from, { text: '🚩 Masih ada game yang berlangsung di grup ini!' });
                if (!(await useStamina(10))) return;

                // Inisialisasi board kosong (9 kotak)
                const board = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
                
                sessionGame.set(from, {
                    type: 'ttt',
                    player: [senderJid], // Player 1 (penantang)
                    board: board,
                    turn: 0, // 0 = Player 1 (X), 1 = Player 2 (O)
                    symbols: ['❌', '⭕']
                });

                await db.query('UPDATE users SET stamina = stamina - 10 WHERE jid = ?', [senderJid]);
                await sock.sendMessage(from, { 
                    text: `🎮 *TIC TAC TOE*\n\n@${senderNumber} menantang siapa saja!\n\n${tttBoard(board)}\n\nKetik angka *1-9* untuk bergabung dan bermain sebagai ⭕`,
                    mentions: [senderJid]
                });
                break;
                case 'allgenshin':
                return await handleGenshin(sock, from, command, arg);

            case 'tebakgenshin':
                if (sessionGame.has(from)) return sock.sendMessage(from, { text: 'Selesaikan game sebelumnya!' });
                
                const [char] = await db.query('SELECT * FROM genshin_chars ORDER BY RAND() LIMIT 1');
                if (!char) return sock.sendMessage(from, { text: 'DB Kosong! Hubungi owner.' });

                sessionGame.set(from, {
                    type: 'genshin',
                    answer: char.name,
                    fullData: char,
                    revealedClues: 1,
                    wrongCount: 0,
                    players: [senderJid],
                    lastAction: Date.now()
                });

                await sock.sendMessage(from, { 
                    text: `🎮 *TEBAK KARAKTER GENSHIN*\n\n@${senderNumber} memulai room!\nMax 4 Players bisa ikut menebak.\n\n*CLUE 1:* 📍 Region: ${char.region}\n\nKetik nama karakter langsung untuk menebak!`,
                    mentions: [senderJid]
                });
                break;
                case 'pictba':
    try {
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

        const apiUrl = "https://api.gimita.id/api/random/bluearchive";
        const rawBuffer = await fetchImage(apiUrl);
        
        if (!rawBuffer || rawBuffer.length < 100) {
            throw new Error("File gambar kosong atau rusak.");
        }

        // Kirim gambar dengan opsi tambahan untuk stabilitas
        await sock.sendMessage(from, { 
            image: Buffer.from(rawBuffer), 
            caption: `✅ *Random Blue Archive Picture*`,
            mimetype: 'image/jpeg',
            // Tambahkan background process agar tidak blocking
        }, { 
            quoted: msg,
            uploadTimeout: 30000 // Beri waktu lebih lama untuk upload (30 detik)
        });

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.error("Error pictba:", e);
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        await sock.sendMessage(from, { text: `❌ *Gagal mengirim media:* ${e.message}\n\n_Tips: Coba ulangi lagi, biasanya masalah koneksi server ke WA._` });
    }
    break;
            case 'dadu':
            case 'roll':
                await rollDice(sock, from, msg);
                break;
            case 'd':
case 'del':
case 'delete':
    return await handleUtils(sock, from, command, arg, m, isOwner, isGroupAdmins, isBotAdmin);
                
        }
    } catch (e) {
        console.error(e);
        // KIRIM LOG ERROR KE OWNER VIA WHATSAPP
        const errorMsg = `❌ *BOT ERROR DETECTED*\n\n` +
                         `💬 *Command:* ${body}\n` +
                         `⚠️ *Error:* ${e.message}\n\n` +
                         `*Stack Trace:* \n\`\`\`${e.stack}\`\`\``;
        
        await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, { text: errorMsg });
    }
}

module.exports = { handleMessage };
