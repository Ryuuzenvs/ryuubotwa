const db = require('./lib/db');

const characters = [
    ['Raiden Shogun', 'Electro', 'Polearm', 'Inazuma', '5', 'Female', 'Tall'],
    ['Kamisato Ayaka', 'Cryo', 'Sword', 'Inazuma', '5', 'Female', 'Medium'],
    ['Zhongli', 'Geo', 'Polearm', 'Liyue', '5', 'Male', 'Tall'],
    ['Hu Tao', 'Pyro', 'Polearm', 'Liyue', '5', 'Female', 'Medium'],
    ['Nahida', 'Dendro', 'Catalyst', 'Sumeru', '5', 'Female', 'Small'],
    ['Furina', 'Hydro', 'Sword', 'Fontaine', '5', 'Female', 'Medium'],
    ['Bennett', 'Pyro', 'Sword', 'Mondstadt', '4', 'Male', 'Medium'],
    ['Kazuha', 'Anemo', 'Sword', 'Inazuma', '5', 'Male', 'Medium']
];

async function seed() {
    try {
        for (let char of characters) {
            await db.query(
                `INSERT INTO genshin_chars (name, element, weapon, region, rarity, gender, body_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                char
            );
            console.log(`✅ Berhasil input: ${char[0]}`);
        }
        console.log('✨ Seeding selesai! Silakan hapus file ini.');
        process.exit();
    } catch (e) {
        console.error('❌ Gagal seeding:', e);
        process.exit(1);
    }
}

seed();
