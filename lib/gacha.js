// lib/gacha.js
function doGacha(count, session) {
    let results = [];
    let pulls = Math.min(count, 100); // Maksimal 100 sesuai request

    for (let i = 0; i < pulls; i++) {
        session.currentPity++;
        session.totalPity++;
        
        let pullRate = 0.006; // Base rate 0.6%
        if (session.currentPity >= 81) {
            pullRate = 0.50;
        } else if (session.currentPity >= 60) {
            pullRate = 0.05;
        } else if (session.currentPity <= 20) {
            pullRate = 0.012;
        }

        // Cek Bintang 5
        if (session.currentPity >= 90 || Math.random() < pullRate) {
            if (session.isGuaranteed || Math.random() < 0.5) {
                // Dapat Limited
                session.totalLimitedB5++;
                session.historyPityL.push(session.currentPity);
                session.isGuaranteed = false;
                results.push('🌟'); // Simbol B5 Limited
            } else {
                // Dapat Standar (Rate Off)
                session.totalStandB5++;
                session.historyPityS.push(session.currentPity);
                session.isGuaranteed = true;
                results.push('💀'); // Simbol B5 Standar
            }
            session.currentPity = 0;
        } 
        // Cek Bintang 4 (Pity 10 sederhana)
        else if (session.totalPity % 10 === 0 || Math.random() < 0.051) {
            results.push('🐾'); // Simbol B4 (Hewan)
        } 
        // Bintang 3
        else {
            results.push('⚔️'); // Simbol B3 (Senjata)
        }
    }
    return results;
}

module.exports = { doGacha };
