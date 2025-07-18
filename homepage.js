// Get today's date in YYYY-MM-DD format
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// API URL configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Get modal elements
const rulesModal = document.getElementById('rules-modal');
const leaderboardModal = document.getElementById('leaderboard-modal');
const rulesBtn = document.getElementById('rules-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const closeButtons = document.getElementsByClassName('close');

// Rules button click handler
rulesBtn.onclick = function() {
    rulesModal.style.display = 'block';
}

// Leaderboard button click handler
leaderboardBtn.onclick = async function() {
    leaderboardModal.style.display = 'block';
    try {
        const response = await fetch(`${API_URL}/leaderboard?date=${getTodayDateString()}`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        
        const scores = await response.json();
        displayLeaderboard(scores);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        document.getElementById('leaderboard-list').innerHTML = 
            '<div class="leaderboard-loading">Failed to load leaderboard. Please try again.</div>';
    }
}

// Close button handlers
Array.from(closeButtons).forEach(btn => {
    btn.onclick = function() {
        rulesModal.style.display = 'none';
        leaderboardModal.style.display = 'none';
    }
});

// Click outside modal to close
window.onclick = function(event) {
    if (event.target == rulesModal) {
        rulesModal.style.display = 'none';
    }
    if (event.target == leaderboardModal) {
        leaderboardModal.style.display = 'none';
    }
}

// Display leaderboard function
function displayLeaderboard(scores) {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (!scores || scores.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-loading">No scores yet today. Be the first!</div>';
        return;
    }
    
    leaderboardList.innerHTML = scores.map((entry, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';
        
        return `
            <div class="leaderboard-entry ${rankClass}">
                <span class="leaderboard-rank">#${rank}</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">${entry.score} words</span>
            </div>
        `;
    }).join('');
}