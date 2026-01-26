const db = require('../lib/db');

async function handleGenshin(sock, from, command, arg) {
    if (command === 'allgenshin') {
        const rows = await db.query('SELECT name FROM genshin_chars ORDER BY name ASC');
        if (rows.length === 0) return sock.sendMessage(from, { text: "Database kosong!" });
        
        let txt = "📜 *LIST KARAKTER GENSHIN*\n\n";
        rows.forEach((row, i) => {
            txt += `${i + 1}. ${row.name}\n`;
        });
        txt += `\n_Gunakan daftar ini untuk menebak agar tidak typo!_`;
        return sock.sendMessage(from, { text: txt });
    }
}

module.exports = { handleGenshin };
