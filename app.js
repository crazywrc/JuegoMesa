let currentQuestion = null;
let apiKey = null;
let localMode = false;
let localQuestions = [];
let stats = {
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    streak: 0
};

let gameEnded = false;

function getStoredItem(key) {
    const value = localStorage.getItem(key);
    try {
        return value ? JSON.parse(value) : null;
    } catch (e) {
        return value;
    }
}

function setStoredItem(key, value) {
    try {
        const stored = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stored);
    } catch (e) {
        console.error('Error saving data', e);
    }
}

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
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const closeInfoBtn = document.getElementById('closeInfoBtn');

// Elementos del DOM para el flujo de configuración
const apiSetupScreen = document.getElementById('apiSetupScreen');
const playerSetupScreen = document.getElementById('playerSetupScreen');
const topicsSetupScreen = document.getElementById('topicsSetupScreen');
const rolesScreen = document.getElementById('rolesScreen');
const rolePlayerNameEl = document.getElementById('currentPlayerRoleName');
const roleInfoEl = document.getElementById('roleInfo');
const showRoleBtn = document.getElementById('showRoleBtn');
const hideRoleBtn = document.getElementById('hideRoleBtn');
const gameScreen = document.getElementById('gameScreen');

const apiKeyNextBtn = document.getElementById('apiKeyNextBtn');
const localModeBtn = document.getElementById('localModeBtn');
const playerNextBtn = document.getElementById('playerNextBtn');
const startGameBtn = document.getElementById('startGameBtn');

// Configuración de jugadores
let players = [];
let numPlayers = 0;
const numPlayersSelect = document.getElementById('numPlayers');
const namesContainer = document.getElementById('namesContainer');

// Roles
let playerRoles = {};
let impostorNames = [];
let currentRoleIndex = 0;

// Elementos de estadísticas
const totalQuestionsEl = document.getElementById('totalQuestions');
const correctAnswersEl = document.getElementById('correctAnswers');
const incorrectAnswersEl = document.getElementById('incorrectAnswers');
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
// Historial de preguntas por ronda (por tema)
let questionHistory = {};

// Elementos de configuración de temas
const globalDifficulty = document.getElementById('globalDifficulty');
const applyGlobalBtn = document.getElementById('applyGlobalBtn');
const topicsContainer = document.getElementById('topicsContainer');

// Event listeners
generateBtn.addEventListener('click', generateQuestion);
showAnswerBtn.addEventListener('click', showAnswer);
resetBtn.addEventListener('click', restartGame);
apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleApiKeyStep();
});

apiKeyNextBtn.addEventListener('click', handleApiKeyStep);
localModeBtn.addEventListener('click', useLocalMode);
numPlayersSelect.addEventListener('change', updatePlayerNameInputs);
startGameBtn.addEventListener('click', handlePlayerSetupAndStart);
globalDifficulty.addEventListener('change', handleGlobalDifficultyChange);
applyGlobalBtn.addEventListener('click', applyGlobalDifficulty);
playerNextBtn.addEventListener('click', handlePlayerNext);
showRoleBtn.addEventListener('click', revealRole);
hideRoleBtn.addEventListener('click', hideRoleAndNext);
infoBtn.addEventListener('click', () => {
    infoModal.style.display = 'block';
});
closeInfoBtn.addEventListener('click', () => {
    infoModal.style.display = 'none';
});
infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) infoModal.style.display = 'none';
});

const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');
tabLinks.forEach(btn => {
    btn.addEventListener('click', () => {
        tabLinks.forEach(b => b.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// Cargar datos guardados
loadSavedData();

function loadSavedData() {
    // Cargar API key
    const storedApiKey = getStoredItem('apiKey');
    if (storedApiKey) {
        apiKey = storedApiKey;
        apiKeyInput.value = storedApiKey;
    } else {
        apiSetupScreen.style.display = 'block';
    }

    // Cargar estadísticas
    const storedStats = getStoredItem('stats');
    if (storedStats) {
        stats = storedStats;
        if (typeof stats.incorrectAnswers !== 'number') {
            stats.incorrectAnswers = 0;
        }
        updateStatsDisplay();
        resetBtn.style.display = 'inline-block';
    }

    // Cargar configuración de jugadores
    const storedPlayers = getStoredItem('players');
    const storedNumPlayers = getStoredItem('numPlayers');
    if (storedPlayers && storedNumPlayers !== null) {
        players = storedPlayers;
        numPlayers = parseInt(storedNumPlayers, 10);
    }

    // Cargar configuración de temas
    const storedTopics = getStoredItem('topicsConfig');
    if (storedTopics) {
        topicsConfig = storedTopics;
    }
}

async function handleApiKeyStep() {
    const inputApiKey = apiKeyInput.value.trim();
    if (!inputApiKey) {
        showMessage('Por favor, introduce una API Key válida.', 'error');
        return;
    }

    apiKeyNextBtn.disabled = true;
    apiKeyNextBtn.textContent = 'Verificando...';

    const valid = await verifyApiKey(inputApiKey);

    apiKeyNextBtn.disabled = false;
    apiKeyNextBtn.textContent = 'Continuar';

    if (valid) {
        apiKey = inputApiKey;
        setStoredItem('apiKey', apiKey);
        showMessage('API Key guardada correctamente.', 'success');
        apiSetupScreen.style.display = 'none';
        playerSetupScreen.style.display = 'block';
        updatePlayerNameInputs();
        loadPlayersConfig();
    } else {
        showMessage('API Key inválida. Por favor verifica tu clave.', 'error');
    }
}

async function verifyApiKey(key) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        return response.ok;
    } catch (err) {
        return false;
    }
}

function useLocalMode() {
    localMode = true;
    loadLocalQuestions();
    apiSetupScreen.style.display = 'none';
    playerSetupScreen.style.display = 'block';
    updatePlayerNameInputs();
    loadPlayersConfig();
    showMessage('Modo local activado. Se usarán preguntas del archivo.', 'success');
}

function loadLocalQuestions() {
    fetch('preguntas.csv')
        .then(r => r.text())
        .then(text => {
            const lines = text.trim().split('\n').slice(1);
            localQuestions = lines.map(line => {
                const parts = line.split(',');
                if (parts.length >= 4) {
                    const [pregunta, respuesta, tema, dificultad] = parts;
                    const topicId = tema.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return {
                        pregunta: pregunta.trim(),
                        respuesta: respuesta.trim(),
                        categoriaId: topicId,
                        categoria: tema.trim(),
                        dificultad: dificultad.trim()
                    };
                }
            }).filter(Boolean);
        })
        .catch(err => {
            console.error('Error al cargar preguntas locales:', err);
            showMessage('No se pudieron cargar las preguntas locales.', 'error');
        });
}

function updatePlayerNameInputs() {
    const previousNumPlayers = namesContainer.children.length;
    const newNumPlayers = parseInt(numPlayersSelect.value);
    
    // Guardar los nombres actuales antes de regenerar
    const currentNames = [];
    for (let i = 0; i < previousNumPlayers; i++) {
        const input = document.getElementById(`playerName${i + 1}`);
        if (input) {
            currentNames[i] = input.value.trim();
        }
    }
    
    numPlayers = newNumPlayers;
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
        
        // Restaurar el nombre si existía
        if (currentNames[i - 1]) {
            input.value = currentNames[i - 1];
        }
        
        inputWrapper.appendChild(input);
        namesContainer.appendChild(inputWrapper);
    }
}

function handlePlayerNext() {
    // Validar que los nombres estén completos
    let allNamesValid = true;
    const nameInputs = document.querySelectorAll('.player-name-input');
    
    // Reiniciar el array de jugadores para asegurar el tamaño correcto
    players = [];
    
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
    
    // Actualizar numPlayers con el valor actual
    numPlayers = players.length;
    
    // Guardar configuración de jugadores
    savePlayersConfig();
    
    // Mostrar pantalla de configuración de temas
    playerSetupScreen.style.display = 'none';
    topicsSetupScreen.style.display = 'block';
    
    // Inicializar configuración de temas
    initializeTopicsConfig();
}

function loadPlayersConfig() {
    const storedPlayers = getStoredItem('players');
    const storedNumPlayers = getStoredItem('numPlayers');
    if (storedPlayers && storedNumPlayers !== null) {
        const savedPlayers = storedPlayers;
        const savedNumPlayers = parseInt(storedNumPlayers, 10);

        if (savedNumPlayers !== parseInt(numPlayersSelect.value)) {
            numPlayersSelect.value = savedNumPlayers;
            numPlayers = savedNumPlayers;
            updatePlayerNameInputs();
        }

        setTimeout(() => {
            savedPlayers.forEach((name, index) => {
                const input = document.getElementById(`playerName${index + 1}`);
                if (input && name) {
                    input.value = name;
                }
            });

            players = [...savedPlayers];
        }, 100);
    }
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

    // Reiniciar historial de preguntas para una nueva ronda
    questionHistory = {};
    
    // Guardar configuración final
    savePlayersConfig();
    saveTopicsConfig();

    // Asignar roles y mostrar pantalla de roles
    assignRoles();
    topicsSetupScreen.style.display = 'none';
    rolesScreen.style.display = 'block';

    currentRoleIndex = 0;
    rolePlayerNameEl.textContent = players[currentRoleIndex];
    roleInfoEl.style.display = 'none';
    roleInfoEl.textContent = '';
    showRoleBtn.style.display = 'inline-block';
    hideRoleBtn.style.display = 'none';
}

function assignRoles() {
    playerRoles = {};
    impostorNames = [];

    let impostorCount = 1;
    if (numPlayers >= 6 && numPlayers <= 7) {
        impostorCount = 2;
    } else if (numPlayers >= 8) {
        impostorCount = 3;
    }

    const indices = Array.from({ length: numPlayers }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const impostorIndices = indices.slice(0, impostorCount);

    players.forEach((name, idx) => {
        if (impostorIndices.includes(idx)) {
            playerRoles[name] = { role: 'saboteador' };
            impostorNames.push(name);
        } else {
            playerRoles[name] = { role: 'buscador' };
        }
    });
}

function revealRole() {
    const player = players[currentRoleIndex];
    const role = playerRoles[player].role;
    let text = '';

    roleInfoEl.classList.remove('role-impostor', 'role-normal');

    if (role === 'saboteador') {
        const others = impostorNames.filter(n => n !== player);
        text = others.length
            ? `Eres <strong>Saboteador del Conocimiento</strong>. Los otros saboteadores son: ${others.join(', ')}`
            : 'Eres el <strong>Saboteador del Conocimiento</strong>.';
        roleInfoEl.classList.add('role-impostor');
    } else {
        text = 'Eres <strong>Buscador de la Sabiduría</strong>.';
        roleInfoEl.classList.add('role-normal');
    }

    roleInfoEl.innerHTML = text;
    roleInfoEl.style.display = 'block';
    showRoleBtn.style.display = 'none';
    hideRoleBtn.style.display = 'inline-block';
}

function hideRoleAndNext() {
    roleInfoEl.style.display = 'none';
    roleInfoEl.textContent = '';
    showRoleBtn.style.display = 'inline-block';
    hideRoleBtn.style.display = 'none';

    currentRoleIndex++;
    if (currentRoleIndex < players.length) {
        rolePlayerNameEl.textContent = players[currentRoleIndex];
    } else {
        rolesScreen.style.display = 'none';
        startGame();
    }
}

function startGame() {
    // Iniciar una nueva ronda, vaciando el historial de preguntas
    questionHistory = {};
    gameEnded = false;
    gameScreen.style.display = 'block';
    generateBtn.disabled = false;

    const enabledTopicNames = availableTopics
        .filter(topic => topicsConfig[topic.id].enabled)
        .map(topic => topic.name)
        .join(', ');

    showMessage(`¡Juego iniciado! Jugadores: ${players.join(', ')}. Temas activos: ${enabledTopicNames}`, 'success');

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
    setStoredItem('topicsConfig', topicsConfig);
}

function loadTopicsConfig() {
    const storedTopics = getStoredItem('topicsConfig');
    if (storedTopics) {
        topicsConfig = storedTopics;
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
}

function savePlayersConfig() {
    setStoredItem('players', players);
    setStoredItem('numPlayers', numPlayers);
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
    if (!localMode && !apiKey) {
        showMessage('Por favor, configura tu API Key primero yendo a la configuración.', 'error');
        return;
    }

    generateBtn.disabled = true;
    generateBtnText.innerHTML = '<span class="loading"></span>Generando...';
    answerBox.style.display = 'none';
    showAnswerBtn.disabled = true;

    const enabledTopics = availableTopics.filter(topic => topicsConfig[topic.id]?.enabled);
    const randomIndex = Math.floor(Math.random() * enabledTopics.length);
    const selectedTopic = enabledTopics[randomIndex];
    const selectedDifficulty = topicsConfig[selectedTopic.id].difficulty;

    const previousQuestions = questionHistory[selectedTopic.id] || [];
    const historyText = previousQuestions.length > 0
        ? `\nNo repitas ninguna de estas preguntas ya utilizadas:\n- ${previousQuestions.join('\n- ')}`
        : '';

    try {
        if (localMode) {
            const availableQs = localQuestions.filter(q => q.categoriaId === selectedTopic.id && q.dificultad === selectedDifficulty && !previousQuestions.includes(q.pregunta));
            if (availableQs.length === 0) {
                showMessage('No hay más preguntas locales para este tema y dificultad.', 'error');
                return;
            }
            currentQuestion = availableQs[Math.floor(Math.random() * availableQs.length)];
        } else {
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
                        content: 'Eres un experto en cultura general que genera preguntas educativas interesantes. Debes generar preguntas del tema específico y dificultad exacta que se te solicita.'
                    }, {
                        role: 'user',
                        content: `Genera una pregunta de cultura general específicamente del tema "${selectedTopic.name}" con dificultad "${selectedDifficulty}".${historyText}

                        Responde ÚNICAMENTE en el siguiente formato JSON:
                        {
                            "pregunta": "La pregunta aquí",
                            "respuesta": "La respuesta detallada aquí (2-3 oraciones explicativas)",
                            "dificultad": "${selectedDifficulty}",
                            "categoria": "${selectedTopic.name}"
                        }

                        La pregunta debe ser específicamente del tema "${selectedTopic.name}" y tener la dificultad "${selectedDifficulty}".
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
            currentQuestion = JSON.parse(content);
        }

        stats.totalQuestions++;
        updateStatsDisplay();
        saveStats();

        const difficultyMap = {
            'muy-facil': { class: 'easy', text: 'Muy Fácil' },
            'facil': { class: 'easy', text: 'Fácil' },
            'medio': { class: 'medium', text: 'Medio' },
            'dificil': { class: 'hard', text: 'Difícil' },
            'muy-dificil': { class: 'hard', text: 'Muy Difícil' }
        };

        const difficulty = difficultyMap[currentQuestion.dificultad] || difficultyMap['medio'];
        const categoryText = currentQuestion.categoria ?
            `<span style="font-size: 0.8em; color: #666; margin-left: 10px;">📚 ${currentQuestion.categoria.toUpperCase()}</span>` : '';

        questionText.innerHTML = `
            <span class="difficulty-badge ${difficulty.class}">${difficulty.text}</span>
            ${categoryText}
            <br><br>
            ${currentQuestion.pregunta}
        `;

        if (!questionHistory[selectedTopic.id]) {
            questionHistory[selectedTopic.id] = [];
        }
        questionHistory[selectedTopic.id].push(currentQuestion.pregunta);

        showAnswerBtn.disabled = false;
        resetBtn.style.display = 'inline-block';
    } catch (error) {
        console.error('Error:', error);
        if (!localMode) {
            if (error.message.includes('401')) {
                showMessage('API Key inválida. Por favor verifica tu clave.', 'error');
            } else if (error.message.includes('429')) {
                showMessage('Has excedido tu cuota de API. Verifica tu cuenta de OpenAI.', 'error');
            } else if (error.message.includes('Failed to fetch')) {
                showMessage('Error de conexión. Verifica tu conexión a internet.', 'error');
            } else {
                showMessage('Error: ' + error.message, 'error');
            }
        } else {
            showMessage('Error al obtener una pregunta local.', 'error');
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
        stats.incorrectAnswers++;
        stats.streak = 0;
        showMessage('¡Sigue intentando! La práctica hace al maestro 💪', 'success');
    }

    updateStatsDisplay();
    saveStats();

    checkGameEnd();
    
    // Remover los botones de feedback
    const feedbackDiv = document.getElementById('answerFeedback');
    if (feedbackDiv) {
        feedbackDiv.remove();
    }
}

function updateStatsDisplay() {
    totalQuestionsEl.textContent = stats.totalQuestions;
    correctAnswersEl.textContent = stats.correctAnswers;
    incorrectAnswersEl.textContent = stats.incorrectAnswers;
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
    setStoredItem('stats', stats);
}

function restartGame() {
    if (confirm('¿Estás seguro de que quieres reiniciar la partida? Se reiniciarán las estadísticas pero se mantendrá la configuración de jugadores y temas.')) {
        // Reiniciar estadísticas
        stats = {
            totalQuestions: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            streak: 0
        };
        // Vaciar historial de preguntas
        questionHistory = {};
        gameEnded = false;
        updateStatsDisplay();
        saveStats();

        // Limpiar roles actuales para que se reasignen en la próxima partida
        playerRoles = {};
        impostorNames = [];

        // Resetear pantalla de roles
        rolesScreen.style.display = 'none';
        roleInfoEl.style.display = 'none';
        roleInfoEl.textContent = '';
        showRoleBtn.style.display = 'inline-block';
        hideRoleBtn.style.display = 'none';

        // Ocultar pantalla de juego
        gameScreen.style.display = 'none';
        
        // Mostrar pantalla de configuración de jugadores
        playerSetupScreen.style.display = 'block';
        
        // Cargar y mostrar la configuración guardada
        updatePlayerNameInputs();
        loadPlayersConfig();
        
        // Resetear estado del juego
        currentQuestion = null;
        answerBox.style.display = 'none';
        showAnswerBtn.disabled = true;
        generateBtn.disabled = true;
        
        // Mostrar mensaje
        showMessage('Partida reiniciada. Las estadísticas se han restablecido. Configura los jugadores para comenzar de nuevo.', 'success');
    }
}

function checkGameEnd() {
    if (gameEnded) return;
    const incorrect = stats.incorrectAnswers;
    if (stats.correctAnswers >= 20) {
        showEndGame('buscador');
    } else if (incorrect >= 10) {
        showEndGame('saboteador');
    }
}

function showEndGame(winnerRole) {
    generateBtn.disabled = true;
    showAnswerBtn.disabled = true;

    gameEnded = true;

    const winnerNames = players.filter(name => playerRoles[name]?.role === (winnerRole === 'buscador' ? 'buscador' : 'saboteador'));
    const teamName = winnerRole === 'buscador' ? 'Buscadores de la Sabiduría' : 'Saboteadores del Conocimiento';

    questionText.innerHTML = `
        <div style="text-align:center;">
            <h3>¡${teamName} han ganado!</h3>
            <p>Integrantes: ${winnerNames.join(', ')}</p>
        </div>
    `;
    answerBox.style.display = 'none';
    showMessage('Fin de la partida', 'success');
}
