const rollDice = async (sock, from, msg) => {
    const angkaDadu = Math.floor(Math.random() * 6) + 1;
    const emojiDadu = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    
    await sock.sendMessage(from, { 
        text: `🎲 | Kamu melemparkan dadu dan mendapatkan angka: *${angkaDadu}*\n\n${emojiDadu[angkaDadu - 1]}` 
    }, { quoted: msg });
};

module.exports = { rollDice };
