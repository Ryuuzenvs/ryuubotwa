const { fetchImage } = require('./lib/downloader');
const fs = require('fs');

async function main() {
    try {
        console.log("📥 Mencoba download gambar...");
        const buffer = await fetchImage("https://api.gimita.id/api/random/bluearchive");
        
        // Cek apakah beneran gambar dengan menyimpannya ke file lokal
        fs.writeFileSync('test_gambar.jpg', Buffer.from(buffer));
        
        console.log("✅ BERHASIL!");
        console.log("Ukuran File:", buffer.byteLength, "bytes");
        console.log("File tersimpan sebagai: test_gambar.jpg");
    } catch (e) {
        console.log("❌ Masih Gagal:", e.message);
    }
}

main();
