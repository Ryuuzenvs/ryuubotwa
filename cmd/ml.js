const db = require('../lib/db');

async function handleML(sock, from, command, arg, sessionGame, senderJid, senderNumber) {
    if (command === 'allhero') {
        const rows = await db.query('SELECT nama_hero FROM hero_ml ORDER BY nama_hero ASC');
        if (rows.length === 0) return sock.sendMessage(from, { text: "Database hero kosong!" });
        
        let txt = "🎮 *LIST HERO MOBILE LEGENDS*\n\n";
        rows.forEach((row, i) => {
            txt += `${i + 1}. ${row.nama_hero}\n`;
        });
        txt += `\n_Gunakan list ini untuk menebak agar tidak typo!_`;
        return sock.sendMessage(from, { text: txt });
    }

    if (command === 'tebakml') {
        if (sessionGame.has(from)) return sock.sendMessage(from, { text: '🚩 Selesaikan game yang sedang berjalan!' });

        const [hero] = await db.query('SELECT * FROM hero_ml ORDER BY RAND() LIMIT 1');
        if (!hero) return sock.sendMessage(from, { text: '❌ Database ML Kosong! Laporkan ke owner.' });

        // Parsing JSON clue_skill
        const skills = typeof hero.clue_skill === 'string' ? JSON.parse(hero.clue_skill) : hero.clue_skill;

        sessionGame.set(from, {
            type: 'ml',
            answer: hero.nama_hero,
            fullData: {
                role: hero.role,
                kelamin: hero.kelamin,
                skills: skills
            },
            revealedClues: 1,
            wrongCount: 0,
            players: [senderJid],
            lastAction: Date.now()
        });

        const menuTxt = `🎮 *TEBAK HERO MOBILE LEGENDS*\n\n` +
                        `@${senderNumber} telah memulai room!\n` +
                        `Max 5 kali salah sebelum game over.\n\n` +
                        `*CLUE 1:* 🎭 Role: ${hero.role}\n\n` +
                        `Ketik nama hero langsung untuk menebak!`;

        await sock.sendMessage(from, { text: menuTxt, mentions: [senderJid] });
    }
}

module.exports = { handleML };
