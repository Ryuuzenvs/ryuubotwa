// commands/gachaHandler.js
const { doGacha } = require('../lib/gacha');

async function handleGachaSim(sock, from, body, sessionGame, senderJid, senderNumber) {
    const session = sessionGame.get(from);

    // Jika belum ada room, buat baru
    if (!session || session.type !== 'gachasim') {
        sessionGame.set(from, {
            type: 'gachasim',
            player: senderJid,
            currentPity: 0,
            totalPity: 0,
            isGuaranteed: false,
            totalLimitedB5: 0,
            totalStandB5: 0,
            historyPityL: [],
            historyPityS: [],
            lastAction: Date.now(),
            timeout: setTimeout(() => {
                if (sessionGame.has(from)) {
                    sessionGame.delete(from);
                    sock.sendMessage(from, { text: "⏱️ *Waktu Habis!* Sesi Gacha Simulasi telah ditutup." });
                }
            }, 60000) // 60 detik
        });

        return sock.sendMessage(from, { 
            text: `🎰 *GACHA SIMULATOR READY!*\n\nUser: @${senderNumber}\nMax: 100 pulls/input.\nDurasi: 60 Detik.\n\nKetik angka (contoh: *10*) untuk mulai gacha!`,
            mentions: [senderJid]
        });
    }

    // Jika sudah ada room, proses input angka
    const pullCount = parseInt(body);
    if (isNaN(pullCount) || pullCount < 1) return;
    if (pullCount > 100) return sock.sendMessage(from, { text: "⚠️ Maksimal 100 pull sekali input!" });

    // Update waktu agar tidak timeout duluan selama masih aktif
    session.lastAction = Date.now();
    
    const items = doGacha(pullCount, session);
    
    // Hitung rata-rata pity Limited
    const avgL = session.historyPityL.length > 0 
        ? (session.historyPityL.reduce((a, b) => a + b, 0) / session.historyPityL.length).toFixed(1) 
        : 0;

    let response = `✨ *HASIL GACHA* (${pullCount} Pulls)\n`;
    response += `========================\n`;
    response += `${items.join(' ')}\n`;
    response += `========================\n`;
    response += `📊 *STATISTIK*\n`;
    response += `┣ 🌟 Limited B5: ${session.totalLimitedB5}\n`;
    response += `┣ 💀 Standar B5: ${session.totalStandB5}\n`;
    response += `┣ 📈 Current Pity: ${session.currentPity}\n`;
    response += `┣ 🏁 Total Pull: ${session.totalPity}\n`;
    response += `┣ 🔐 Status: ${session.isGuaranteed ? 'Guaranteed' : '50/50'}\n`;
    response += `┣ 🕒 Avg Pity B5L: ${avgL}\n`;
    response += `┗ 📜 History L: [${session.historyPityL.join(', ')}]\n\n`;
    response += `_Ketik angka lagi untuk lanjut atau tunggu 60 detik untuk selesai._`;

    await sock.sendMessage(from, { text: response });
}

module.exports = { handleGachaSim };
