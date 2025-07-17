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
    
    modal.style.display = 'block';
}

// Close completion modal
document.addEventListener('DOMContentLoaded', function() {
    const completionModal = document.getElementById('completion-modal');
    const closeCompletion = document.getElementsByClassName('close-completion')[0];
    
    if (closeCompletion) {
        closeCompletion.onclick = function() {
            completionModal.style.display = 'none';
        }
    }
    
    window.addEventListener('click', function(event) {
        if (event.target == completionModal) {
            completionModal.style.display = 'none';
        }
    });
});const gridContainer = document.getElementById('grid');
const submitWordBtn = document.getElementById('submit-word');
const definitionDisplay = document.getElementById('word-definition');
let score = 0;
let selectedWord = [];
let perfectSolutionWords = [];
let validWordsPlayed = [];

// Modal functionality
const modal = document.getElementById('rules-modal');
const infoBtn = document.getElementById('info-button');
const span = document.getElementsByClassName('close')[0];

infoBtn.onclick = function() {
    modal.style.display = 'block';
}

span.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function generateRandomWordLengths(targetLength = 25, maxWordLength = 10) {
    let lengths = [];
    let totalLength = 0;
    const minWordLength = 5;

    while (totalLength + minWordLength <= targetLength) {
        let spaceLeft = targetLength - totalLength;
        let wordLength = spaceLeft > maxWordLength ? Math.floor(Math.random() * (maxWordLength - minWordLength + 1)) + minWordLength : spaceLeft;

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

function fetchWordsAndPopulateGrid(targetLength = 25) {
    let letters = [];
    perfectSolutionWords = []; 
    let desiredWordLengths = generateRandomWordLengths(targetLength);
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
                    const randomIndex = Math.floor(Math.random() * validWords.length);
                    const word = validWords[randomIndex].word;

                    if (letters.length + word.length <= targetLength) {
                        letters = [...letters, ...word.split('')];
                        perfectSolutionWords.push(word);
                    }

                    if (letters.length >= targetLength || wordLengthsIndex === desiredWordLengths.length - 1) {
                        letters = letters.slice(0, targetLength);
                        shuffleArray(letters);
                        populateGrid(letters);
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
    shuffleArray(tiles);

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
    
    // Clear previous entry
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
           
function checkGameCompletion() {
    const allGreen = [...gridContainer.querySelectorAll('.grid-cell')].every(cell => cell.classList.contains('correct'));
    if (allGreen) {
        showCompletionModal();
    }
}

submitWordBtn.addEventListener('click', submitWord);
document.getElementById('shuffle-button').addEventListener('click', shuffleTiles);

// Initialize the game with a populated grid
fetchWordsAndPopulateGrid();