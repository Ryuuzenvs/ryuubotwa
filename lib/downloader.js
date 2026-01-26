const axios = require('axios');
const http = require('http');
const https = require('https');

const fetchImage = async (url) => {
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            timeout: 15000,
            // PAKSA menggunakan IPv4
            httpAgent: new http.Agent({ family: 4 }),
            httpsAgent: new https.Agent({ family: 4, rejectUnauthorized: false }),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
                'Connection': 'keep-alive'
            }
        });

        return response.data;
    } catch (error) {
        // Jika error.message kosong, kita ambil detail dari objek error
        const errMsg = error.message || (error.code ? `Network Code: ${error.code}` : "Unknown Network Error");
        console.error("Downloader Error Detail:", errMsg);
        throw new Error(errMsg);
    }
};

module.exports = { fetchImage };
