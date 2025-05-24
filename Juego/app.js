let currentQuestion = null;
let apiKey = null;
let stats = {
    totalQuestions: 0,
    correctAnswers: 0,
    streak: 0
};

// Elementos del DOM
const apiKeyInput = document.getElementById('apiKey');
const startBtn = document.getElementById('startBtn');
const generateBtn = document.getElementById('generateBtn');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const resetBtn = document.getElementById('resetBtn');
const questionText = document.getElementById('questionText');
const answerBox = document.getElementById('answerBox');
const answerText = document.getElementById('answerText');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const apiSetup = document.getElementById('apiSetup');
const generateBtnText = document.getElementById('generateBtnText');

// Configuración de jugadores
let players = [];
let numPlayers = 0;
const playerSetup = document.getElementById('playerSetup');
const playerNames = document.getElementById('playerNames');
const numPlayersSelect = document.getElementById('numPlayers');
const playerSetupNextBtn = document.getElementById('playerSetupNextBtn');
const namesContainer = document.getElementById('namesContainer');
const saveNamesBtn = document.getElementById('saveNamesBtn');

// Elementos de estadísticas
const totalQuestionsEl = document.getElementById('totalQuestions');
const correctAnswersEl = document.getElementById('correctAnswers');
const streakEl = document.getElementById('streak');

// Event listeners
startBtn.addEventListener('click', validateAndStart);
generateBtn.addEventListener('click', generateQuestion);
showAnswerBtn.addEventListener('click', showAnswer);
resetBtn.addEventListener('click', resetStats);
apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validateAndStart();
});
playerSetupNextBtn.addEventListener('click', showNameInputs);
saveNamesBtn.addEventListener('click', savePlayerNames);

// Cargar datos guardados
loadSavedData();

function loadSavedData() {
    // Cargar API key
    chrome.storage.sync.get(['apiKey'], (result) => {
        if (result.apiKey) {
            apiKey = result.apiKey;
            apiKeyInput.value = result.apiKey;
            // La partida se habilitará una vez configurados los jugadores
        }
    });

    // Cargar estadísticas
    chrome.storage.local.get(['stats'], (result) => {
        if (result.stats) {
            stats = result.stats;
            updateStatsDisplay();
            resetBtn.style.display = 'inline-block';
        }
    });
}

function validateAndStart() {
    const inputApiKey = apiKeyInput.value.trim();
    if (inputApiKey) {
        apiKey = inputApiKey;
        chrome.storage.sync.set({ apiKey: apiKey });
        enableGame();
        showMessage('¡Bienvenido! Comienza a jugar generando tu primera pregunta', 'success');
    } else {
        showMessage('Por favor ingresa una API Key válida', 'error');
    }
}

function enableGame() {
    generateBtn.disabled = false;
    apiSetup.style.display = 'none';
    questionText.textContent = 'Presiona "Generar Pregunta" para comenzar el juego';
    if (stats.totalQuestions > 0) {
        resetBtn.style.display = 'inline-block';
    }
}

function showMessage(message, type) {
    const messageEl = type === 'error' ? errorMessage : successMessage;
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 4000);
}

async function generateQuestion() {
    if (!apiKey) {
        showMessage('Por favor configura tu API Key primero', 'error');
        return;
    }

    // Deshabilitar botón y mostrar loading
    generateBtn.disabled = true;
    generateBtnText.innerHTML = '<span class="loading"></span>Generando...';
    answerBox.style.display = 'none';
    showAnswerBtn.disabled = true;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'Eres un experto en cultura general que genera preguntas educativas interesantes. Debes generar preguntas variadas y educativas.'
                }, {
                    role: 'user',
                    content: `Genera una pregunta de cultura general. La dificultad debe ser aleatoria entre fácil, media y difícil. 
                    
                    Responde ÚNICAMENTE en el siguiente formato JSON:
                    {
                        "pregunta": "La pregunta aquí",
                        "respuesta": "La respuesta detallada aquí (2-3 oraciones explicativas)",
                        "dificultad": "facil" o "media" o "dificil",
                        "categoria": "historia" o "ciencia" o "geografia" o "arte" o "deportes" o "tecnologia" o "literatura" o "naturaleza" o "musica" o "cine"
                    }
                    
                    Las preguntas deben ser variadas y de diferentes categorías.
                    La respuesta debe ser informativa, educativa y contener datos interesantes.
                    No incluyas texto adicional, solo el JSON.`
                }],
                temperature: 0.9,
                max_tokens: 600
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en la API');
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parsear el JSON de la respuesta
        try {
            currentQuestion = JSON.parse(content);
            
            // Actualizar estadísticas
            stats.totalQuestions++;
            updateStatsDisplay();
            saveStats();
            
            // Mostrar la pregunta con badge de dificultad
            const difficultyMap = {
                'facil': { class: 'easy', text: 'Fácil' },
                'media': { class: 'medium', text: 'Media' },
                'dificil': { class: 'hard', text: 'Difícil' }
            };
            
            const difficulty = difficultyMap[currentQuestion.dificultad] || difficultyMap['media'];
            
            // Incluir categoría si existe
            const categoryText = currentQuestion.categoria ? 
                `<span style="font-size: 0.8em; color: #666; margin-left: 10px;">📚 ${currentQuestion.categoria.toUpperCase()}</span>` : '';
            
            questionText.innerHTML = `
                <span class="difficulty-badge ${difficulty.class}">${difficulty.text}</span>
                ${categoryText}
                <br><br>
                ${currentQuestion.pregunta}
            `;
            
            showAnswerBtn.disabled = false;
            resetBtn.style.display = 'inline-block';
        } catch (parseError) {
            console.error('Error al parsear JSON:', content);
            throw new Error('Error al procesar la respuesta');
        }

    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('401')) {
            showMessage('API Key inválida. Por favor verifica tu clave.', 'error');
        } else if (error.message.includes('429')) {
            showMessage('Has excedido tu cuota de API. Verifica tu cuenta de OpenAI.', 'error');
        } else if (error.message.includes('Failed to fetch')) {
            showMessage('Error de conexión. Verifica tu conexión a internet.', 'error');
        } else {
            showMessage('Error: ' + error.message, 'error');
        }
        questionText.textContent = 'Error al generar la pregunta. Intenta nuevamente.';
    } finally {
        generateBtn.disabled = false;
        generateBtnText.textContent = 'Generar Nueva Pregunta';
    }
}

function showAnswer() {
    if (currentQuestion && currentQuestion.respuesta) {
        answerText.textContent = currentQuestion.respuesta;
        answerBox.style.display = 'block';
        showAnswerBtn.disabled = true;
        
        // Mostrar botones para marcar si acertó o no
        setTimeout(() => {
            if (!document.getElementById('answerFeedback')) {
                const feedbackDiv = document.createElement('div');
                feedbackDiv.id = 'answerFeedback';
                feedbackDiv.style.marginTop = '20px';
                feedbackDiv.style.textAlign = 'center';
                feedbackDiv.innerHTML = `
                    <p style="margin-bottom: 15px; font-size: 1.1em; color: #555;">¿Acertaste la respuesta?</p>
                    <button id="correctBtn" style="background: #4caf50; color: white; padding: 10px 25px; margin: 0 10px; border: none; border-radius: 25px; cursor: pointer; font-size: 1em;">
                        ✓ Sí, acerté
                    </button>
                    <button id="incorrectBtn" style="background: #f44336; color: white; padding: 10px 25px; margin: 0 10px; border: none; border-radius: 25px; cursor: pointer; font-size: 1em;">
                        ✗ No acerté
                    </button>
                `;
                answerBox.appendChild(feedbackDiv);
                
                // Agregar event listeners a los botones
                document.getElementById('correctBtn').addEventListener('click', () => markAnswer(true));
                document.getElementById('incorrectBtn').addEventListener('click', () => markAnswer(false));
            }
        }, 500);
    }
}

function markAnswer(correct) {
    if (correct) {
        stats.correctAnswers++;
        stats.streak++;
        showMessage(`¡Excelente! Racha actual: ${stats.streak} 🔥`, 'success');
    } else {
        stats.streak = 0;
        showMessage('¡Sigue intentando! La práctica hace al maestro 💪', 'success');
    }
    
    updateStatsDisplay();
    saveStats();
    
    // Remover los botones de feedback
    const feedbackDiv = document.getElementById('answerFeedback');
    if (feedbackDiv) {
        feedbackDiv.remove();
    }
}

function updateStatsDisplay() {
    totalQuestionsEl.textContent = stats.totalQuestions;
    correctAnswersEl.textContent = stats.correctAnswers;
    streakEl.textContent = stats.streak;
    
    // Agregar efectos visuales para la racha
    if (stats.streak >= 5) {
        streakEl.style.color = '#ff6b6b';
        streakEl.style.fontSize = '2.2em';
    } else if (stats.streak >= 3) {
        streakEl.style.color = '#ff9800';
        streakEl.style.fontSize = '2.1em';
    } else {
        streakEl.style.color = '#2196f3';
        streakEl.style.fontSize = '2em';
    }
}

function saveStats() {
    chrome.storage.local.set({ stats: stats });
}

function resetStats() {
    if (confirm('¿Estás seguro de que quieres reiniciar todas las estadísticas?')) {
        stats = {
            totalQuestions: 0,
            correctAnswers: 0,
            streak: 0
        };
        updateStatsDisplay();
        saveStats();
        showMessage('Estadísticas reiniciadas', 'success');
    }
}

function showNameInputs() {
    numPlayers = parseInt(numPlayersSelect.value);
    if (numPlayers < 4 || numPlayers > 10) {
        showMessage('El número de jugadores debe ser entre 4 y 10', 'error');
        return;
    }

    namesContainer.innerHTML = '';
    for (let i = 1; i <= numPlayers; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `playerName${i}`;
        input.placeholder = `Jugador ${i}`;
        namesContainer.appendChild(input);
    }
    playerSetup.style.display = 'none';
    playerNames.style.display = 'block';
    questionText.textContent = 'Escriu el nom de cada jugador';
}

function savePlayerNames() {
    players = [];
    for (let i = 1; i <= numPlayers; i++) {
        const name = document.getElementById(`playerName${i}`).value.trim() || `Jugador ${i}`;
        players.push(name);
    }
    playerNames.style.display = 'none';
    apiSetup.style.display = 'block';
    questionText.textContent = 'Introdueix la teva API Key per començar a jugar';
}
