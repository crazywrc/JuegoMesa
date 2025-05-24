let currentQuestion = null;
let apiKey = null;
let stats = {
    totalQuestions: 0,
    correctAnswers: 0,
    streak: 0
};

// Elementos del DOM
const apiKeyInput = document.getElementById('apiKey');
const generateBtn = document.getElementById('generateBtn');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const resetBtn = document.getElementById('resetBtn');
const questionText = document.getElementById('questionText');
const answerBox = document.getElementById('answerBox');
const answerText = document.getElementById('answerText');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const generateBtnText = document.getElementById('generateBtnText');

// Elementos del DOM para el flujo de configuración
const apiSetupScreen = document.getElementById('apiSetupScreen');
const playerSetupScreen = document.getElementById('playerSetupScreen');
const topicsSetupScreen = document.getElementById('topicsSetupScreen');
const gameScreen = document.getElementById('gameScreen');

const apiKeyNextBtn = document.getElementById('apiKeyNextBtn');
const playerNextBtn = document.getElementById('playerNextBtn');
const startGameBtn = document.getElementById('startGameBtn');

// Configuración de jugadores
let players = [];
let numPlayers = 0;
const numPlayersSelect = document.getElementById('numPlayers');
const namesContainer = document.getElementById('namesContainer');

// Elementos de estadísticas
const totalQuestionsEl = document.getElementById('totalQuestions');
const correctAnswersEl = document.getElementById('correctAnswers');
const streakEl = document.getElementById('streak');

// Configuración de temas
const availableTopics = [
    { id: 'tecnologia', name: 'Tecnología', icon: '💻' },
    { id: 'social', name: 'Social', icon: '👥' },
    { id: 'historia', name: 'Historia', icon: '📚' },
    { id: 'geografia', name: 'Geografía', icon: '🌍' },
    { id: 'arte', name: 'Arte', icon: '🎨' },
    { id: 'deportes', name: 'Deportes', icon: '⚽' }
];

let topicsConfig = {};

// Elementos de configuración de temas
const globalDifficulty = document.getElementById('globalDifficulty');
const applyGlobalBtn = document.getElementById('applyGlobalBtn');
const topicsContainer = document.getElementById('topicsContainer');

// Event listeners
generateBtn.addEventListener('click', generateQuestion);
showAnswerBtn.addEventListener('click', showAnswer);
resetBtn.addEventListener('click', resetStats);
apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleApiKeyStep();
});

apiKeyNextBtn.addEventListener('click', handleApiKeyStep);
numPlayersSelect.addEventListener('change', updatePlayerNameInputs);
startGameBtn.addEventListener('click', handlePlayerSetupAndStart);
globalDifficulty.addEventListener('change', handleGlobalDifficultyChange);
applyGlobalBtn.addEventListener('click', applyGlobalDifficulty);
playerNextBtn.addEventListener('click', handlePlayerNext);

// Cargar datos guardados
loadSavedData();

function loadSavedData() {
    // Cargar API key
    chrome.storage.sync.get(['apiKey'], (result) => {
        if (result.apiKey) {
            apiKey = result.apiKey;
            apiKeyInput.value = result.apiKey;
        } else {
            apiSetupScreen.style.display = 'block';
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

    // Cargar configuración de temas
    chrome.storage.sync.get(['topicsConfig'], (result) => {
        if (result.topicsConfig) {
            topicsConfig = result.topicsConfig;
        }
    });
}

function handleApiKeyStep() {
    const inputApiKey = apiKeyInput.value.trim();
    if (inputApiKey) {
        apiKey = inputApiKey;
        chrome.storage.sync.set({ apiKey: apiKey }, () => {
            showMessage('API Key guardada correctamente.', 'success');
            apiSetupScreen.style.display = 'none';
            playerSetupScreen.style.display = 'block';
            updatePlayerNameInputs();
        });
    } else {
        showMessage('Por favor, introduce una API Key válida.', 'error');
    }
}

function updatePlayerNameInputs() {
    numPlayers = parseInt(numPlayersSelect.value);
    namesContainer.innerHTML = '';
    
    for (let i = 1; i <= numPlayers; i++) {
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'player-input-wrapper';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `playerName${i}`;
        input.className = 'player-name-input';
        input.placeholder = `Nombre del jugador ${i}`;
        input.required = true;
        
        inputWrapper.appendChild(input);
        namesContainer.appendChild(inputWrapper);
    }
}

function handlePlayerNext() {
    // Validar que los nombres estén completos
    let allNamesValid = true;
    const nameInputs = document.querySelectorAll('.player-name-input');
    
    nameInputs.forEach((input, index) => {
        const name = input.value.trim();
        if (!name) {
            allNamesValid = false;
            input.style.borderColor = '#ff6b6b';
        } else {
            players[index] = name;
            input.style.borderColor = '#e2e8f0';
        }
    });
    
    if (!allNamesValid) {
        showMessage('Por favor, completa todos los nombres de los jugadores.', 'error');
        return;
    }
    
    // Guardar configuración de jugadores
    savePlayersConfig();
    
    // Mostrar pantalla de configuración de temas
    playerSetupScreen.style.display = 'none';
    topicsSetupScreen.style.display = 'block';
    
    // Inicializar configuración de temas
    initializeTopicsConfig();
}

function initializeTopicsConfig() {
    // Inicializar configuración por defecto (todos activados con dificultad media)
    availableTopics.forEach(topic => {
        if (!topicsConfig[topic.id]) {
            topicsConfig[topic.id] = {
                enabled: true,
                difficulty: 'medio'
            };
        }
    });
    
    // Generar las tarjetas de temas
    generateTopicCards();
    
    // Cargar configuración guardada si existe
    loadTopicsConfig();
}

function generateTopicCards() {
    topicsContainer.innerHTML = '';
    
    availableTopics.forEach(topic => {
        const topicCard = document.createElement('div');
        topicCard.className = 'topic-card';
        topicCard.dataset.topicId = topic.id;
        
        topicCard.innerHTML = `
            <div class="topic-header">
                <span class="topic-icon">${topic.icon}</span>
                <span class="topic-title">${topic.name}</span>
            </div>
            <div class="topic-controls">
                <div class="enable-toggle">
                    <input type="checkbox" id="enable-${topic.id}" ${topicsConfig[topic.id]?.enabled ? 'checked' : ''}>
                    <label for="enable-${topic.id}">Activar tema</label>
                </div>
                <div class="difficulty-control">
                    <label for="difficulty-${topic.id}">Dificultad:</label>
                    <select id="difficulty-${topic.id}" class="difficulty-select" ${!topicsConfig[topic.id]?.enabled ? 'disabled' : ''}>
                        <option value="muy-facil" ${topicsConfig[topic.id]?.difficulty === 'muy-facil' ? 'selected' : ''}>Muy Fácil</option>
                        <option value="facil" ${topicsConfig[topic.id]?.difficulty === 'facil' ? 'selected' : ''}>Fácil</option>
                        <option value="medio" ${topicsConfig[topic.id]?.difficulty === 'medio' ? 'selected' : ''}>Medio</option>
                        <option value="dificil" ${topicsConfig[topic.id]?.difficulty === 'dificil' ? 'selected' : ''}>Difícil</option>
                        <option value="muy-dificil" ${topicsConfig[topic.id]?.difficulty === 'muy-dificil' ? 'selected' : ''}>Muy Difícil</option>
                    </select>
                </div>
            </div>
        `;
        
        // Event listeners para cada tarjeta
        const checkbox = topicCard.querySelector(`#enable-${topic.id}`);
        const difficultySelect = topicCard.querySelector(`#difficulty-${topic.id}`);
        
        checkbox.addEventListener('change', () => handleTopicToggle(topic.id, checkbox.checked));
        difficultySelect.addEventListener('change', () => handleTopicDifficultyChange(topic.id, difficultySelect.value));
        
        topicsContainer.appendChild(topicCard);
        
        // Aplicar estado visual inicial
        updateTopicCardVisual(topic.id);
    });
}

function handleTopicToggle(topicId, enabled) {
    topicsConfig[topicId].enabled = enabled;
    updateTopicCardVisual(topicId);
    saveTopicsConfig();
    
    // Verificar que al menos un tema esté activado
    const enabledTopics = Object.values(topicsConfig).filter(config => config.enabled);
    if (enabledTopics.length === 0) {
        showMessage('Debes tener al menos un tema activado para continuar.', 'error');
        // Reactivar el tema
        topicsConfig[topicId].enabled = true;
        document.getElementById(`enable-${topicId}`).checked = true;
        updateTopicCardVisual(topicId);
    }
}

function handleTopicDifficultyChange(topicId, difficulty) {
    topicsConfig[topicId].difficulty = difficulty;
    saveTopicsConfig();
}

function updateTopicCardVisual(topicId) {
    const topicCard = document.querySelector(`[data-topic-id="${topicId}"]`);
    const difficultySelect = topicCard.querySelector(`#difficulty-${topicId}`);
    const isEnabled = topicsConfig[topicId].enabled;
    
    if (isEnabled) {
        topicCard.classList.remove('disabled');
        difficultySelect.disabled = false;
    } else {
        topicCard.classList.add('disabled');
        difficultySelect.disabled = true;
    }
}

function handleGlobalDifficultyChange() {
    const selectedDifficulty = globalDifficulty.value;
    applyGlobalBtn.disabled = !selectedDifficulty;
}

function applyGlobalDifficulty() {
    const selectedDifficulty = globalDifficulty.value;
    if (!selectedDifficulty) return;
    
    // Aplicar la dificultad a todos los temas habilitados
    Object.keys(topicsConfig).forEach(topicId => {
        if (topicsConfig[topicId].enabled) {
            topicsConfig[topicId].difficulty = selectedDifficulty;
            document.getElementById(`difficulty-${topicId}`).value = selectedDifficulty;
        }
    });
    
    saveTopicsConfig();
    showMessage(`Dificultad "${selectedDifficulty}" aplicada a todos los temas activos.`, 'success');
    
    // Resetear el select global
    globalDifficulty.value = '';
    applyGlobalBtn.disabled = true;
}

function handlePlayerSetupAndStart() {
    // Validar que haya al menos un tema activado
    const enabledTopics = Object.values(topicsConfig).filter(config => config.enabled);
    if (enabledTopics.length === 0) {
        showMessage('Debes tener al menos un tema activado para comenzar.', 'error');
        return;
    }
    
    // Guardar configuración final
    savePlayersConfig();
    saveTopicsConfig();
    
    // Iniciar el juego
    topicsSetupScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    
    // Habilitar el botón de generar pregunta
    generateBtn.disabled = false;
    
    // Mostrar mensaje de bienvenida
    const enabledTopicNames = availableTopics
        .filter(topic => topicsConfig[topic.id].enabled)
        .map(topic => topic.name)
        .join(', ');
    
    showMessage(`¡Juego iniciado! Jugadores: ${players.join(', ')}. Temas activos: ${enabledTopicNames}`, 'success');
    
    // Actualizar el texto inicial del juego
    questionText.innerHTML = `
        <div style="text-align: center; color: #4a5568; line-height: 1.6;">
            <h3 style="color: #2d3748; margin-bottom: 20px;">🎯 ¡Bienvenidos al Juego de Trivia!</h3>
            <p><strong>Jugadores:</strong> ${players.join(', ')}</p>
            <p><strong>Temas activos:</strong> ${enabledTopicNames}</p>
            <p style="margin-top: 25px; font-size: 1.1em;">Haz clic en "Generar Pregunta" para comenzar</p>
        </div>
    `;
}

function saveTopicsConfig() {
    chrome.storage.sync.set({ topicsConfig: topicsConfig });
}

function loadTopicsConfig() {
    chrome.storage.sync.get(['topicsConfig'], (result) => {
        if (result.topicsConfig) {
            topicsConfig = result.topicsConfig;
            // Actualizar la UI con la configuración cargada
            Object.keys(topicsConfig).forEach(topicId => {
                const checkbox = document.getElementById(`enable-${topicId}`);
                const difficultySelect = document.getElementById(`difficulty-${topicId}`);
                
                if (checkbox && difficultySelect) {
                    checkbox.checked = topicsConfig[topicId].enabled;
                    difficultySelect.value = topicsConfig[topicId].difficulty;
                    updateTopicCardVisual(topicId);
                }
            });
        }
    });
}

function savePlayersConfig() {
    chrome.storage.sync.set({ 
        players: players,
        numPlayers: numPlayers 
    });
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
        showMessage('Por favor, configura tu API Key primero yendo a la configuración.', 'error');
        return;
    }

    // Deshabilitar botón y mostrar loading
    generateBtn.disabled = true;
    generateBtnText.innerHTML = '<span class="loading"></span>Generando...';
    answerBox.style.display = 'none';
    showAnswerBtn.disabled = true;

    // Obtener temas y dificultades habilitados
    const enabledTopics = availableTopics.filter(topic => topicsConfig[topic.id]?.enabled);
    const topicNames = enabledTopics.map(topic => topic.name.toLowerCase()).join(', ');
    
    // Construir lista de dificultades por tema
    const topicDifficulties = enabledTopics.map(topic => {
        const difficulty = topicsConfig[topic.id].difficulty;
        return `${topic.name}: ${difficulty}`;
    }).join(', ');

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
                    content: 'Eres un experto en cultura general que genera preguntas educativas interesantes. Debes generar preguntas variadas y educativas basadas en los temas y dificultades específicas proporcionadas.'
                }, {
                    role: 'user',
                    content: `Genera una pregunta de cultura general de uno de estos temas específicos: ${topicNames}.
                    
                    Usa las dificultades configuradas para cada tema: ${topicDifficulties}
                    
                    Responde ÚNICAMENTE en el siguiente formato JSON:
                    {
                        "pregunta": "La pregunta aquí",
                        "respuesta": "La respuesta detallada aquí (2-3 oraciones explicativas)",
                        "dificultad": "muy-facil" o "facil" o "medio" o "dificil" o "muy-dificil",
                        "categoria": "${topicNames.split(', ')[0]}" (usar uno de los temas habilitados)
                    }
                    
                    La dificultad debe corresponder exactamente a la configurada para el tema elegido.
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
                'muy-facil': { class: 'easy', text: 'Muy Fácil' },
                'facil': { class: 'easy', text: 'Fácil' },
                'medio': { class: 'medium', text: 'Medio' },
                'dificil': { class: 'hard', text: 'Difícil' },
                'muy-dificil': { class: 'hard', text: 'Muy Difícil' }
            };
            
            const difficulty = difficultyMap[currentQuestion.dificultad] || difficultyMap['medio'];
            
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
