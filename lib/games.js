// lib/games.js

/**
 * Logika TicTacToe Sederhana
 */
const tttBoard = (board) => {
    let txt = `🎮 *TIC TAC TOE*\n\n`;
    const rows = [
        [board[0], board[1], board[2]],
        [board[3], board[4], board[5]],
        [board[6], board[7], board[8]]
    ];
    txt += rows.map(row => row.join(' | ')).join('\n----------\n');
    return txt;
};

const checkWinner = (board) => {
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
        [0, 4, 8], [2, 4, 6]             // Diagonal
    ];
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (board[a] !== '⬜' && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return board.includes('⬜') ? null : 'seri';
};

/**
 * Logika Tebak Bom
 */
const generateBomBoard = (revealed = []) => {
    let board = "";
    for (let i = 1; i <= 9; i++) {
        if (revealed.includes(i)) {
            board += "🟩 "; // Kotak aman yang sudah dibuka
        } else {
            board += "⬜ "; // Kotak belum dibuka
        }
        if (i % 3 === 0) board += "\n";
    }
    return board;
};

module.exports = {
    tttBoard,
    checkWinner,
    generateBomBoard
};
