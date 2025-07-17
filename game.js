// Daily game functionality
const STORAGE_KEY = 'dailyVocab';
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Game state variables
let gridContainer;
let submitWordBtn;
let definitionDisplay;
let score = 0;
let selectedWord = [];
let perfectSolutionWords = [];
let validWordsPlayed = [];
let dailyLetters = [];

function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function getDisplayDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
}

function getStoredData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveStoredData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function hasPlayedToday() {
    const data = getStoredData();
    const today = getTodayDateString();
    return data[today]?.completed || false;
}

function saveGameState() {
    const data = getStoredData();
    const today = getTodayDateString();
    
    // Get current game state
    const gridCells = Array.from(gridContainer.querySelectorAll('.grid-cell'));
    
    // Only save if we have a valid grid
    if (gridCells.length === 0) return;
    
    const gridState = gridCells.map(cell => ({
        letter: cell.textContent,
        isCorrect: cell.classList.contains('correct')
    }));
    
    // Debug log
    console.log('saveGameState called - score:', score, 'validWordsPlayed:', validWordsPlayed);
    
    // Get current dictionary entry
    const dictEntry = document.querySelector('#definition .dict-entry');
    let lastDictEntry = null;
    if (dictEntry) {
        const wordEl = dictEntry.querySelector('.dict-word');
        const defEl = dictEntry.querySelector('.dict-definition');
        if (wordEl && defEl && wordEl.textContent && defEl.textContent) {
            lastDictEntry = {
                word: wordEl.textContent,
                definition: defEl.textContent
            };
        } else if (validWordsPlayed.length > 0) {
            // If the dictionary is still animating, use the last word from our array
            lastDictEntry = {
                word: validWordsPlayed[validWordsPlayed.length - 1].toUpperCase(),
                definition: "Loading definition..."
            };
        }
    }
    
    if (!data[today]) {
        data[today] = {};
    }
    
    data[today].gameState = {
        gridState: gridState,
        score: score,
        validWordsPlayed: validWordsPlayed,
        perfectSolutionWords: perfectSolutionWords,
        dailyLetters: dailyLetters,
        lastDictEntry: lastDictEntry,
        timestamp: new Date().toISOString()
    };
    
    console.log('Saving complete - data saved:', data[today].gameState);
    saveStoredData(data);
}

function loadGameState() {
    const data = getStoredData();
    const today = getTodayDateString();
    const todayData = data[today];
    
    if (todayData && todayData.gameState && todayData.gameState.gridState) {
        console.log('Loading game state:', todayData.gameState);
        
        // Restore game variables
        perfectSolutionWords = todayData.gameState.perfectSolutionWords || [];
        dailyLetters = todayData.gameState.dailyLetters || [];
        
        // IMPORTANT: Restore validWordsPlayed array
        validWordsPlayed = todayData.gameState.validWordsPlayed || [];
        console.log('Restored validWordsPlayed:', validWordsPlayed);
        
        // Restore grid - check if gridState exists and has content
        if (todayData.gameState.gridState.length > 0) {
            gridContainer.innerHTML = '';
            todayData.gameState.gridState.forEach(cellData => {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                if (cellData.isCorrect) {
                    cell.classList.add('correct');
                }
                cell.textContent = cellData.letter;
                cell.addEventListener('click', () => selectLetter(cell));
                gridContainer.appendChild(cell);
            });
            
            // Restore words list from validWordsPlayed array
            const wordsList = document.getElementById('valid-words-list');
            wordsList.innerHTML = '';
            if (validWordsPlayed && validWordsPlayed.length > 0) {
                validWordsPlayed.forEach((word, index) => {
                    const li = document.createElement('li');
                    li.setAttribute('data-number', index + 1);
                    li.textContent = word;
                    wordsList.appendChild(li);
                });
                // Set score based on the number of words played
                score = validWordsPlayed.length;
            } else {
                score = 0;
            }
            
            // Restore dictionary entry
            const dictContainer = document.getElementById('definition');
            dictContainer.innerHTML = '';
            if (todayData.gameState.lastDictEntry && todayData.gameState.lastDictEntry.word) {
                const entry = document.createElement('div');
                entry.className = 'dict-entry';
                
                const wordElement = document.createElement('span');
                wordElement.className = 'dict-word';
                wordElement.textContent = todayData.gameState.lastDictEntry.word;
                
                const defElement = document.createElement('span');
                defElement.className = 'dict-definition';
                defElement.textContent = todayData.gameState.lastDictEntry.definition;
                
                entry.appendChild(wordElement);
                entry.appendChild(defElement);
                dictContainer.appendChild(entry);
            }
            
            // Check if game was completed
            if (todayData.completed) {
                checkGameCompletion();
            }
            
            return true; // Game state was loaded
        }
    }
    
    return false; // No saved state or invalid state
}

function saveGameCompletion(score, playerName) {
    const data = getStoredData();
    const today = getTodayDateString();
    
    if (!data[today]) {
        data[today] = {};
    }
    
    data[today].completed = true;
    data[today].score = score;
    data[today].playerName = playerName;
    data[today].timestamp = new Date().toISOString();
    
    saveStoredData(data);
}

// Seeded random number generator for consistent daily puzzles
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getDailySeed() {
    const date = getTodayDateString();
    let hash = 0;
    for (let i = 0; i < date.length; i++) {
        const char = date.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Modified array shuffle to use seeded random
function shuffleArraySeeded(array, seed) {
    let currentSeed = seed;
    for (let i = array.length - 1; i > 0; i--) {
        currentSeed++;
        const j = Math.floor(seededRandom(currentSeed) * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Generate consistent word lengths for the day
function generateDailyWordLengths(seed, targetLength = 25, maxWordLength = 10) {
    let lengths = [];
    let totalLength = 0;
    const minWordLength = 5;
    let currentSeed = seed;

    while (totalLength + minWordLength <= targetLength) {
        currentSeed++;
        let spaceLeft = targetLength - totalLength;
        let wordLength = spaceLeft > maxWordLength 
            ? Math.floor(seededRandom(currentSeed) * (maxWordLength - minWordLength + 1)) + minWordLength 
            : spaceLeft;

        lengths.push(wordLength);
        totalLength += wordLength;

        if (spaceLeft - wordLength === 4) {
            lengths.push(4);
            break;
        }
    }

    if (totalLength < targetLength) {
        let lastLength = lengths.pop();
        lastLength += targetLength - totalLength;
        lengths.push(lastLength);
    }

    return lengths;
}

// Leaderboard functions
async function submitScore(playerName, score) {
    try {
        const response = await fetch(`${API_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: playerName,
                score: score,
                date: getTodayDateString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit score');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

async function getLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard?date=${getTodayDateString()}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

function displayLeaderboard(scores, currentPlayerName = null, elementId = 'leaderboard-list') {
    const leaderboardList = document.getElementById(elementId);
    
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
        
        const isCurrentPlayer = currentPlayerName && entry.name === currentPlayerName;
        const playerClass = isCurrentPlayer ? 'current-player' : '';
        
        return `
            <div class="leaderboard-entry ${rankClass} ${playerClass}">
                <span class="leaderboard-rank">#${rank}</span>
                <span class="leaderboard-name">${entry.name}</span>
                <span class="leaderboard-score">${entry.score}</span>
            </div>
        `;
    }).join('');
}

// Modified fetch function to use seeded random for word selection
function fetchDailyPuzzle() {
    const seed = getDailySeed();
    let letters = [];
    perfectSolutionWords = [];
    let desiredWordLengths = generateDailyWordLengths(seed);
    let retries = new Array(desiredWordLengths.length).fill(0);
    const maxRetries = 3;

    function fetchWord(wordLengthsIndex = 0) {
        if (wordLengthsIndex >= desiredWordLengths.length) return;

        let wordLength = desiredWordLengths[wordLengthsIndex];
        fetch(`https://api.datamuse.com/words?sp=?${'?'.repeat(wordLength - 1)}&md=d&max=100`)
            .then(response => response.json())
            .then(data => {
                const validWords = data.filter(d => !perfectSolutionWords.includes(d.word) && /^[a-zA-Z]{3,}$/.test(d.word));

                if (validWords.length > 0) {
                    // Use seeded random for consistent word selection
                    const wordSeed = seed + wordLengthsIndex;
                    const randomIndex = Math.floor(seededRandom(wordSeed) * validWords.length);
                    const word = validWords[randomIndex].word;

                    if (letters.length + word.length <= 25) {
                        letters = [...letters, ...word.split('')];
                        perfectSolutionWords.push(word);
                    }

                    if (letters.length >= 25 || wordLengthsIndex === desiredWordLengths.length - 1) {
                        letters = letters.slice(0, 25);
                        dailyLetters = [...letters]; // Store original order
                        shuffleArraySeeded(letters, seed);
                        populateGrid(letters);
                        // Don't save immediately on initial load - wait for game state to stabilize
                        console.log('Initial puzzle created, not saving yet');
                    } else {
                        fetchWord(wordLengthsIndex + 1);
                    }
                } else {
                    if (retries[wordLengthsIndex] < maxRetries) {
                        console.log(`Retrying word fetch for length ${wordLength}. Attempt ${retries[wordLengthsIndex] + 1}`);
                        retries[wordLengthsIndex]++;
                        fetchWord(wordLengthsIndex);
                    } else {
                        console.log(`Max retries reached for word length ${wordLength}. Moving to next length.`);
                        fetchWord(wordLengthsIndex + 1);
                    }
                }
            }).catch(error => {
                console.error('Error fetching word:', error);
                if (retries[wordLengthsIndex] < maxRetries) {
                    console.log(`Retrying word fetch for length ${wordLength}. Attempt ${retries[wordLengthsIndex] + 1}`);
                    retries[wordLengthsIndex]++;
                    fetchWord(wordLengthsIndex);
                } else {
                    console.log(`Max retries reached for word length ${wordLength}. Moving to next length.`);
                    fetchWord(wordLengthsIndex + 1);
                }
            });
    }

    fetchWord();
}

function populateGrid(letters) {
    gridContainer.innerHTML = '';
    letters.forEach(letter => {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        cell.textContent = letter.toUpperCase();
        cell.addEventListener('click', () => selectLetter(cell));
        gridContainer.appendChild(cell);
    });
}

function selectLetter(cell) {
    const letter = cell.textContent;

    if (cell.classList.contains('selected')) {
        cell.classList.remove('selected');
        selectedWord = selectedWord.filter(({ cell: selectedCell }) => selectedCell !== cell);
    } else {
        cell.classList.add('selected');
        selectedWord.push({ cell, letter });
    }
    updateDisplayedWord();
}

function updateDisplayedWord() {
    const currentWordDisplay = document.getElementById('current-word-display');
    const currentWord = selectedWord.map(({ letter }) => letter).join('');
    currentWordDisplay.textContent = currentWord;
}

function shuffleTiles() {
    const tiles = Array.from(gridContainer.querySelectorAll('.grid-cell'));
    const seed = getDailySeed() + Date.now(); // Add timestamp for variety while maintaining daily consistency
    shuffleArraySeeded(tiles, seed);

    gridContainer.innerHTML = '';
    tiles.forEach(tile => {
        gridContainer.appendChild(tile);
    });
}

function typeWriter(element, text, speed = 50, callback) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }
    
    type();
}

function addDictionaryEntry(word, definition) {
    const dictContainer = document.getElementById('definition');
    
    // Clear previous entries - only show the most recent word
    dictContainer.innerHTML = '';
    
    // Create dictionary entry
    const entry = document.createElement('div');
    entry.className = 'dict-entry';
    entry.style.opacity = '0';
    
    const wordElement = document.createElement('span');
    wordElement.className = 'dict-word';
    
    const defElement = document.createElement('span');
    defElement.className = 'dict-definition';
    
    entry.appendChild(wordElement);
    entry.appendChild(defElement);
    dictContainer.appendChild(entry);
    
    // Fade in and type
    setTimeout(() => {
        entry.style.transition = 'opacity 0.3s';
        entry.style.opacity = '1';
        
        typeWriter(wordElement, word.toUpperCase(), 50, () => {
            typeWriter(defElement, definition, 20);
        });
    }, 100);
}

function createConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
    const confettiCount = 100;
    
    // Create container for confetti
    const container = document.createElement('div');
    container.id = 'confetti-container';
    document.body.appendChild(container);
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
    }
    
    // Remove confetti container after animation
    setTimeout(() => container.remove(), 2500);
}

function showError(message) {
    const wordDisplay = document.getElementById('current-word-display');
    const gameContainer = document.getElementById('game-container');
    
    // Add shake and red color to word
    wordDisplay.classList.add('error');
    
    // Create error bubble
    const bubble = document.createElement('div');
    bubble.className = 'error-bubble';
    bubble.textContent = message;
    gameContainer.style.position = 'relative';
    gameContainer.appendChild(bubble);
    
    // Remove error effects after animation
    setTimeout(() => {
        wordDisplay.classList.remove('error');
        bubble.remove();
    }, 2000);
}

function submitWord() {
    const word = selectedWord.map(({ letter }) => letter).join('').toLowerCase();
    if (word.length < 5) {
        showError('Words must be at least 5 letters!');
        // Delay clearing the word to match error bubble duration
        setTimeout(() => {
            selectedWord.forEach(({ cell }) => cell.classList.remove('selected'));
            selectedWord = [];
            updateDisplayedWord();
        }, 2000);
        return;
    }

    fetch(`https://api.datamuse.com/words?sp=${word}&md=d&max=1`)
        .then(response => response.json())
        .then(data => {
            if (data.some(entry => entry.word === word)) {
                const entry = data.find(entry => entry.word === word);
                selectedWord.forEach(({ cell }) => {
                    if (cell.classList.contains('correct')) {
                        cell.classList.remove('correct');
                    } else {
                        cell.classList.add('correct');
                    }
                    cell.classList.remove('selected');
                });

                score++;
                validWordsPlayed.push(word);

                // Add to dictionary with typewriter effect
                const definition = entry.defs ? entry.defs[0].split('\t').pop() : "No definition available.";
                // Normalize whitespace in the definition
                const cleanDefinition = definition.replace(/\s+/g, ' ').trim();
                addDictionaryEntry(word, cleanDefinition);

                // Create and type out the word in the list
                const li = document.createElement('li');
                li.setAttribute('data-number', score);
                li.style.opacity = '0';
                document.getElementById('valid-words-list').appendChild(li);
                
                // Fade in the list item then type the word
                setTimeout(() => {
                    li.style.transition = 'opacity 0.3s';
                    li.style.opacity = '1';
                    typeWriter(li, word, 60);
                }, 100);

                selectedWord = [];
                updateDisplayedWord();
                saveGameState(); // Save after each valid word
                checkGameCompletion();
            } else {
                showError('Invalid word!');
                // Delay clearing the word to match error bubble duration
                setTimeout(() => {
                    selectedWord.forEach(({ cell }) => cell.classList.remove('selected'));
                    selectedWord = [];
                    updateDisplayedWord();
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Failed to validate word!');
            // Delay clearing the word to match error bubble duration
            setTimeout(() => {
                selectedWord.forEach(({ cell }) => cell.classList.remove('selected'));
                selectedWord = [];
                updateDisplayedWord();
            }, 2000);
        });
}

function fetchPerfectSolutionDefinitions() {
    const definitionsPromises = perfectSolutionWords.map(word => 
        fetch(`https://api.datamuse.com/words?sp=${word}&md=d&max=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0 && data[0].defs) {
                    return {
                        word: word,
                        definition: data[0].defs[0].split('\t').pop()
                    };
                }
                return {
                    word: word,
                    definition: "No definition available."
                };
            })
            .catch(() => ({
                word: word,
                definition: "Definition lookup failed."
            }))
    );
    
    return Promise.all(definitionsPromises);
}

function showCompletionModal() {
    createConfetti();
    
    const modal = document.getElementById('completion-modal');
    const wordsUsedElement = document.getElementById('words-used');
    const perfectWordsElement = document.getElementById('perfect-words');
    const perfectDefinitionsElement = document.getElementById('perfect-definitions');
    
    // Set the number of words used
    wordsUsedElement.textContent = score;
    
    // Display perfect solution words
    perfectWordsElement.innerHTML = '';
    perfectSolutionWords.forEach(word => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'solution-word';
        wordSpan.textContent = word;
        perfectWordsElement.appendChild(wordSpan);
    });
    
    // Fetch and display definitions
    perfectDefinitionsElement.innerHTML = '<p style="margin-top: 15px; font-style: italic;">Loading definitions...</p>';
    
    fetchPerfectSolutionDefinitions().then(definitions => {
        perfectDefinitionsElement.innerHTML = '<h4 style="margin-top: 20px; color: #4A90E2;">Definitions:</h4>';
        definitions.forEach(({ word, definition }) => {
            const defDiv = document.createElement('div');
            defDiv.style.marginBottom = '10px';
            defDiv.style.textAlign = 'left';
            defDiv.innerHTML = `<strong>${word.toUpperCase()}:</strong> ${definition}`;
            perfectDefinitionsElement.appendChild(defDiv);
        });
    });
    
    // Check if already played today
    const todayData = getStoredData()[getTodayDateString()];
    if (todayData?.completed) {
        document.getElementById('submit-score-section').innerHTML = 
            `<p>You've already submitted your score today!</p>
             <p>Your score: <strong>${todayData.score}</strong> as <strong>${todayData.playerName}</strong></p>`;
        // Show leaderboard automatically if already submitted
        loadCompletionLeaderboard();
    } else {
        // Focus on name input for new completion
        setTimeout(() => {
            const nameInput = document.getElementById('player-name');
            if (nameInput) {
                nameInput.focus();
            }
        }, 300);
    }
    
    modal.style.display = 'block';
}

async function loadCompletionLeaderboard() {
    try {
        const scores = await getLeaderboard();
        const todayData = getStoredData()[getTodayDateString()];
        displayLeaderboard(scores, todayData?.playerName, 'completion-leaderboard-list');
        document.getElementById('completion-leaderboard').style.display = 'block';
    } catch (error) {
        console.error('Error loading completion leaderboard:', error);
    }
}

function checkGameCompletion() {
    const allGreen = [...gridContainer.querySelectorAll('.grid-cell')].every(cell => cell.classList.contains('correct'));
    if (allGreen) {
        showCompletionModal();
    }
}

// Debug function to check localStorage
function debugGameState() {
    const data = getStoredData();
    console.log('Stored game data:', data);
    const today = getTodayDateString();
    console.log('Today\'s date:', today);
    console.log('Today\'s data:', data[today]);
    if (data[today] && data[today].gameState) {
        console.log('Words played:', data[today].gameState.validWordsPlayed);
        console.log('Last dict entry:', data[today].gameState.lastDictEntry);
        console.log('Score in storage:', data[today].gameState.score);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements after page loads
    gridContainer = document.getElementById('grid');
    submitWordBtn = document.getElementById('submit-word');
    definitionDisplay = document.getElementById('word-definition');
    
    console.log('DOM loaded - validWordsPlayed at start:', validWordsPlayed);
    
    // Modal functionality
    const modal = document.getElementById('rules-modal');
    const infoBtn = document.getElementById('info-button');
    const span = document.getElementsByClassName('close')[0];

    if (infoBtn) {
        infoBtn.onclick = function() {
            modal.style.display = 'block';
        }
    }

    if (span) {
        span.onclick = function() {
            modal.style.display = 'none';
        }
    }

    // Leaderboard modal
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardBtn = document.getElementById('leaderboard-button');
    const closeLeaderboard = document.getElementsByClassName('close-leaderboard')[0];

    if (leaderboardBtn) {
        leaderboardBtn.onclick = async function() {
            leaderboardModal.style.display = 'block';
            try {
                const scores = await getLeaderboard();
                const todayData = getStoredData()[getTodayDateString()];
                displayLeaderboard(scores, todayData?.playerName);
            } catch (error) {
                document.getElementById('leaderboard-list').innerHTML = 
                    '<div class="leaderboard-loading">Failed to load leaderboard. Please try again.</div>';
            }
        }
    }

    if (closeLeaderboard) {
        closeLeaderboard.onclick = function() {
            leaderboardModal.style.display = 'none';
        }
    }

    // Global window click handlers
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
        if (event.target == leaderboardModal) {
            leaderboardModal.style.display = 'none';
        }
    }

    // Set today's date
    const dailyDateElement = document.getElementById('daily-date');
    if (dailyDateElement) {
        dailyDateElement.textContent = getDisplayDate();
    }

    // Submit word button
    if (submitWordBtn) {
        submitWordBtn.addEventListener('click', submitWord);
    }

    // Shuffle button
    const shuffleBtn = document.getElementById('shuffle-button');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', shuffleTiles);
    }

    // Submit score functionality
    const submitScoreBtn = document.getElementById('submit-score-btn');
    const playerNameInput = document.getElementById('player-name');
    const submitMessage = document.getElementById('submit-message');
    
    if (submitScoreBtn) {
        submitScoreBtn.onclick = async function() {
            const playerName = playerNameInput.value.trim();
            
            if (!playerName) {
                submitMessage.textContent = 'Please enter your name!';
                submitMessage.className = 'error';
                return;
            }
            
            submitScoreBtn.disabled = true;
            submitMessage.textContent = 'Submitting...';
            submitMessage.className = '';
            
            try {
                await submitScore(playerName, score);
                saveGameCompletion(score, playerName);
                submitMessage.textContent = 'Score submitted successfully!';
                submitMessage.className = '';
                
                // Update the submit section
                setTimeout(() => {
                    document.getElementById('submit-score-section').innerHTML = 
                        `<p>Score submitted successfully!</p>
                         <p>Your score: <strong>${score}</strong></p>`;
                    // Load and show leaderboard after submission
                    loadCompletionLeaderboard();
                }, 1500);
            } catch (error) {
                submitMessage.textContent = 'Failed to submit score. Please try again.';
                submitMessage.className = 'error';
                submitScoreBtn.disabled = false;
            }
        };
    }

    // Allow Enter key to submit score
    if (playerNameInput) {
        playerNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && submitScoreBtn) {
                submitScoreBtn.click();
            }
        });
    }

    // Close completion modal
    const completionModal = document.getElementById('completion-modal');
    const closeCompletion = document.getElementsByClassName('close-completion')[0];
    
    if (closeCompletion) {
        closeCompletion.onclick = function() {
            completionModal.style.display = 'none';
        }
    }
    
    // Completion modal window click handler
    window.addEventListener('click', function(event) {
        if (event.target == completionModal) {
            completionModal.style.display = 'none';
        }
    });

    // Add keyboard shortcut to clear data (Ctrl+Shift+R)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            if (confirm('Clear all game data and start fresh?')) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        }
    });
    
    // Debug: Check what's in storage
    debugGameState();
    
    // Try to load saved state first, if not fetch new puzzle
    const stateLoaded = loadGameState();
    console.log('State loaded:', stateLoaded);
    
    if (!stateLoaded) {
        console.log('Fetching new daily puzzle...');
        // Initialize validWordsPlayed for new game
        validWordsPlayed = [];
        fetchDailyPuzzle();
    }
});