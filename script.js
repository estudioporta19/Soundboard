// Variáveis Globais (início do script)
let audioContext;
let masterGainNode; // Node de ganho mestre
let soundData = []; // Array para armazenar os dados dos sons
const defaultKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
                     'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
                     'z', 'x', 'c', 'v', 'b', 'n', 'm'];
const NUM_CELLS = defaultKeys.length;
let lastPlayedSoundIndex = null;
const globalActiveGainNodes = new Set(); // Conjunto para todos os gain nodes ativos globalmente

// Elementos do DOM
const soundboardGrid = document.querySelector('.soundboard-grid');
const volumeRange = document.getElementById('volume-range');
const volumeDisplay = document.getElementById('volume-display');
const playMultipleCheckbox = document.getElementById('play-multiple');
const autokillModeCheckbox = document.getElementById('autokill-mode');
const fadeOutDisplay = document.getElementById('fadeout-display');
const fadeInDisplay = document.getElementById('fadein-display'); // NOVO: Elemento do display de Fade In
const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');
const langButtons = document.querySelectorAll('.lang-button');

// Variáveis para as durações de fade
let currentFadeOutDuration = 0; // Padrão: 0 segundos (paragem imediata)
let currentFadeInDuration = 0;  // NOVO: Padrão para fade in (0 segundos, início imediato)

// Objeto de traduções (deve ser carregado de um JSON ou definido aqui)
let translations = {};
let currentLanguage = localStorage.getItem('currentLanguage') || 'pt'; // Carrega idioma guardado ou padrão 'pt'

// Função para inicializar o AudioContext
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGainNode = audioContext.createGain();
        masterGainNode.connect(audioContext.destination);
        masterGainNode.gain.value = volumeRange.value; // Define o volume inicial
    }
}

// Carregar traduções do arquivo JSON
async function loadTranslations() {
    try {
        const response = await fetch('translations.json');
        translations = await response.json();
        // Aplica as traduções iniciais após o carregamento
        setLanguage(currentLanguage);
    } catch (error) {
        console.error('Erro ao carregar traduções:', error);
    }
}

// Aplicar traduções
function setLanguage(lang) {
    currentLanguage = lang;
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.dataset.key;
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    // Atualiza os displays de volume e fade para usar o texto traduzido
    updateVolumeDisplay();
    updateFadeOutDisplay();
    updateFadeInDisplay(); // NOVO: Atualiza o display de fade in
    updateAllCellDisplays(); // Atualiza nomes de células vazias
    saveSettings(); // Guarda a preferência de idioma
    updateLanguageButtons(); // Atualiza os botões de idioma
}

// Função para atualizar o estado ativo dos botões de idioma
function updateLanguageButtons() {
    langButtons.forEach(button => {
        if (button.dataset.lang === currentLanguage) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Função para atualizar todos os displays de célula (útil para mudança de idioma)
function updateAllCellDisplays() {
    document.querySelectorAll('.sound-cell').forEach((cell, index) => {
        if (soundData[index]) {
            updateCellDisplay(cell, soundData[index], false);
        } else {
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '' }, true);
        }
    });
}

// Cria as células da soundboard (chamado na inicialização)
function createSoundboardCells() {
    const rows = {
        'row-top': defaultKeys.slice(0, 10),
        'row-home': defaultKeys.slice(10, 19),
        'row-bottom': defaultKeys.slice(19, 26)
    };

    for (const rowId in rows) {
        const rowElement = document.getElementById(rowId);
        if (rowElement) {
            rows[rowId].forEach(keyChar => {
                const index = defaultKeys.indexOf(keyChar);
                const cell = document.createElement('div');
                cell.classList.add('sound-cell');
                cell.dataset.index = index; // Armazena o índice na célula

                cell.innerHTML = `
                    <span class="sound-name" contenteditable="false">${translations[currentLanguage].cellEmptyDefault}</span>
                    <button class="replace-sound-button" title="${translations[currentLanguage].replaceSoundTooltip}"><span class="material-symbols-outlined">upload_file</span></button>
                    <button class="delete-button" title="${translations[currentLanguage].deleteSoundTooltip}">❌</button>
                    <span class="key-display-bottom">${keyChar.toUpperCase()}</span>
                `;
                rowElement.appendChild(cell);

                // Adiciona event listeners para carregar som ao clicar
                cell.addEventListener('click', (e) => {
                    if (e.target.classList.contains('sound-name') && e.target.contentEditable === 'true') {
                        // Não faz nada se estiver a editar o nome
                        return;
                    }
                    if (e.target.classList.contains('delete-button')) {
                        // Lidar com o delete/fade out no mousedown/mouseup
                        return;
                    }
                    if (e.target.closest('.replace-sound-button')) {
                        // Lidar com o replace
                        return;
                    }
                    if (soundData[index] && soundData[index].audioBuffer) {
                        playSound(index);
                    } else {
                        triggerFileLoad(cell, index);
                    }
                });

                // Lógica de drag-and-drop
                cell.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    cell.classList.add('drag-over');
                });
                cell.addEventListener('dragleave', () => {
                    cell.classList.remove('drag-over');
                });
                cell.addEventListener('drop', (e) => {
                    e.preventDefault();
                    cell.classList.remove('drag-over');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        loadFileIntoCell(files[0], cell, index);
                    }
                });

                // Event listener para substituir som
                const replaceButton = cell.querySelector('.replace-sound-button');
                replaceButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Evita que o clique na célula seja acionado
                    triggerFileLoad(cell, index);
                });

                // Lógica de click e click longo para o botão de apagar/fade out
                const deleteButton = cell.querySelector('.delete-button');
                let pressTimer;
                deleteButton.addEventListener('mousedown', (e) => {
                    e.stopPropagation(); // Previne o clique na célula
                    pressTimer = setTimeout(() => {
                        clearSoundCell(index, currentFadeOutDuration); // Click longo: fade out
                        pressTimer = null; // Resetar o timer
                    }, 500); // 0.5 segundos para considerar "longo"
                });
                deleteButton.addEventListener('mouseup', (e) => {
                    e.stopPropagation();
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        if (pressTimer !== null) { // Se não foi um click longo
                            clearSoundCell(index, 0); // Click curto: parar imediatamente
                        }
                    }
                    pressTimer = null; // Garante que o timer é resetado
                });
                deleteButton.addEventListener('mouseleave', () => {
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                });

                // Lógica para edição do nome do som
                const nameDisplay = cell.querySelector('.sound-name');
                nameDisplay.addEventListener('click', (e) => {
                    if (!cell.classList.contains('empty')) {
                        e.stopPropagation(); // Evita o play/carregamento ao clicar no nome
                        nameDisplay.contentEditable = true;
                        nameDisplay.focus();
                    }
                });
                nameDisplay.addEventListener('blur', () => {
                    nameDisplay.contentEditable = false;
                    if (soundData[index]) {
                        soundData[index].name = nameDisplay.textContent;
                        saveSettings();
                    }
                });
                nameDisplay.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); // Previne a nova linha
                        nameDisplay.blur(); // Sai do modo de edição
                    }
                });
            });
        }
    }
}

// Gatilho para carregar arquivo (input hidden)
function triggerFileLoad(cell, index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mp3, audio/wav, audio/ogg';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await loadFileIntoCell(file, cell, index);
        }
    };
    input.click();
}

// Carrega um arquivo de áudio numa célula
async function loadFileIntoCell(file, cell, index) {
    initAudioContext();

    // Limpar o som existente antes de carregar um novo
    clearSoundCell(index, 0.1); // Fade out rápido antes de carregar novo som

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const arrayBuffer = e.target.result;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;

            soundData[index] = {
                name: file.name.split('.')[0], // Nome do arquivo sem extensão
                key: defaultKeys[index],
                audioBuffer: audioBuffer,
                audioDataUrl: e.target.result, // Armazena o Data URL (grande!)
                activeGainNodes: new Set(),
                color: randomColor
            };
            cell.style.backgroundColor = randomColor;
            updateCellDisplay(cell, soundData[index], false);
            saveSettings();
        } catch (error) {
            console.error('Erro ao decodificar áudio:', error);
            alert(translations[currentLanguage].alertDecodeError.replace('{soundName}', file.name));
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '' }, true);
            soundData[index] = null;
            saveSettings();
        }
    };
    reader.onerror = (error) => {
        console.error('Erro ao ler arquivo:', error);
        alert(translations[currentLanguage].alertReadFileError.replace('{fileName}', file.name));
    };
    reader.readAsDataURL(file);
}

// Carrega um som a partir de um Data URL (usado ao carregar do localStorage)
async function loadSoundFromDataURL(dataUrl, cell, index, name, key, color) {
    initAudioContext();

    try {
        const base64Audio = dataUrl.split(',')[1];
        const arrayBuffer = base64ToArrayBuffer(base64Audio);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const fixedKey = defaultKeys[index];

        soundData[index] = {
            name: name || translations[currentLanguage].cellNoName, // Usa tradução
            key: fixedKey,
            audioBuffer: audioBuffer,
            audioDataUrl: dataUrl,
            activeGainNodes: new Set(),
            color: color
        };
        cell.style.backgroundColor = color;
        updateCellDisplay(cell, soundData[index], false);
    } catch (error) {
        console.error('Erro ao decodificar áudio do Data URL:', error);
        alert(translations[currentLanguage].alertDecodeError.replace('{soundName}', name || '')); // Usa tradução
        updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '' }, true);
        soundData[index] = null;
        saveSettings();
    }
}

// Converte Base64 para ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// Atualiza a exibição da célula com o nome e a tecla
function updateCellDisplay(cell, data, isEmpty) {
    const nameDisplay = cell.querySelector('.sound-name');
    const keyDisplayBottom = cell.querySelector('.key-display-bottom');
    const deleteButton = cell.querySelector('.delete-button');
    const replaceButton = cell.querySelector('.replace-sound-button');

    if (isEmpty) {
        cell.classList.add('empty');
        nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault; // Usa tradução
        nameDisplay.contentEditable = false;
        deleteButton.style.display = 'none';
        replaceButton.style.display = 'none';
        cell.style.backgroundColor = 'transparent';
    } else {
        cell.classList.remove('empty');
        nameDisplay.textContent = data.name || translations[currentLanguage].cellNoName; // Usa tradução
        nameDisplay.contentEditable = true;
        deleteButton.style.display = 'flex';
        replaceButton.style.display = 'flex';
        cell.style.backgroundColor = data.color;
    }
    keyDisplayBottom.textContent = defaultKeys[cell.dataset.index] ? defaultKeys[cell.dataset.index].toUpperCase() : '';
}

// Reproduz um som
function playSound(index) {
    const sound = soundData[index];
    if (!sound || !sound.audioBuffer) {
        return;
    }

    initAudioContext();

    if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
        const lastCell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
        if (lastCell) lastCell.classList.remove('active');
        fadeoutSound(lastPlayedSoundIndex, currentFadeOutDuration);
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            playActualSound(sound, index, currentFadeInDuration); // NOVO: Passa currentFadeInDuration
            lastPlayedSoundIndex = index;
        }).catch(e => console.error('Erro ao retomar AudioContext:', e));
    } else {
        playActualSound(sound, index, currentFadeInDuration); // NOVO: Passa currentFadeInDuration
        lastPlayedSoundIndex = index;
    }
}

// Funções de reprodução real e fade in
function playActualSound(sound, index, fadeInDuration = 0) { // NOVO: Recebe fadeInDuration
    const source = audioContext.createBufferSource();
    source.buffer = sound.audioBuffer;

    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.masterGainNode);
    source.connect(gainNode);

    // NOVO: Lógica de Fade In
    const now = audioContext.currentTime;
    if (fadeInDuration > 0) {
        gainNode.gain.setValueAtTime(0.001, now); // Começa quase no zero para evitar click
        gainNode.gain.linearRampToValueAtTime(1, now + fadeInDuration); // Rampa para volume total
    } else {
        gainNode.gain.setValueAtTime(1, now); // Inicia imediatamente no volume total
    }


    sound.activeGainNodes.add(gainNode);
    globalActiveGainNodes.add(gainNode);

    const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('active');
        source.onended = () => {
            setTimeout(() => {
                cell.classList.remove('active');
                sound.activeGainNodes.delete(gainNode);
                globalActiveGainNodes.delete(gainNode);
                source.disconnect();
                gainNode.disconnect();
            }, 50);
        };
    }

    if (playMultipleCheckbox.checked) {
        source.start(0);
    } else {
        // Stop any currently playing instances of THIS sound
        sound.activeGainNodes.forEach(gN => {
            if (gN !== gainNode) { // Don't stop the new sound's gain node
                gN.gain.cancelScheduledValues(audioContext.currentTime);
                gN.gain.setValueAtTime(gN.gain.value, audioContext.currentTime);
                gN.gain.linearRampToValueAtTime(0.001, audioContext.currentTime + 0.1); // Quick fade out for other instances
                setTimeout(() => {
                    gN.disconnect();
                    globalActiveGainNodes.delete(gN);
                }, 150);
            }
        });
        sound.activeGainNodes.clear(); // Clear old ones
        sound.activeGainNodes.add(gainNode); // Add the new one
        source.start(0);
    }
}

function fadeoutSound(index, duration) {
    const sound = soundData[index];
    if (!sound || !sound.audioBuffer) {
        return;
    }

    initAudioContext();
    const now = audioContext.currentTime;
    const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);

    if (duration === 0) {
        sound.activeGainNodes.forEach(gainNode => {
            if (gainNode) {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.disconnect();
                globalActiveGainNodes.delete(gainNode);
            }
        });
        sound.activeGainNodes.clear();
        if (cell) cell.classList.remove('active');
        console.log(`Sound ${index} stopped immediately.`);
    } else {
        sound.activeGainNodes.forEach(gainNode => {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

            setTimeout(() => {
                if (gainNode) {
                    gainNode.disconnect();
                    globalActiveGainNodes.delete(gainNode);
                }
            }, duration * 1000 + 50);
        });
        sound.activeGainNodes.clear();
        if (cell) {
            cell.classList.remove('active');
        }
        console.log(`Sound ${index} fading out over ${duration} seconds.`);
    }
}

function clearSoundCell(index, fadeDuration = 0.1) {
    const sound = soundData[index];
    if (!sound) {
        return;
    }

    initAudioContext();

    fadeoutSound(index, fadeDuration);

    setTimeout(() => {
        clearSoundData(index);

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '' }, true);
            cell.classList.remove('active');
        }

        saveSettings();
        if (lastPlayedSoundIndex === index) {
            lastPlayedSoundIndex = null;
        }
        console.log(`Célula ${index} limpa.`);
    }, fadeDuration * 1000 + 100);
}

function clearSoundData(index) {
    const sound = soundData[index];
    if (sound && sound.activeGainNodes) {
        sound.activeGainNodes.forEach(gainNode => {
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.disconnect();
            globalActiveGainNodes.delete(gainNode);
        });
        sound.activeGainNodes.clear();
    }
    soundData[index] = null;
}

// Guardar configurações no localStorage
function saveSettings() {
    const settingsToSave = {
        volume: parseFloat(volumeRange.value),
        playMultiple: playMultipleCheckbox.checked,
        autokillMode: autokillModeCheckbox.checked,
        currentFadeOutDuration: currentFadeOutDuration,
        currentFadeInDuration: currentFadeInDuration, // NOVO: Guarda a duração do fade in
        currentLanguage: currentLanguage, // Guarda o idioma atual
        sounds: soundData.map(data => ({
            name: data ? data.name : null,
            key: data ? data.key : null,
            audioDataUrl: data ? data.audioDataUrl : null, // MANTIDO: ainda guarda o data URL
            color: data ? data.color : null
        }))
    };
    try {
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert(translations[currentLanguage].alertQuotaExceeded); // Usa tradução
            console.error("Erro: Limite de armazenamento excedido! Não foi possível salvar todos os sons.", e);
            // Opcional: Se for um problema constante, pode-se decidir não salvar audioDataUrl aqui
            // ou avisar o usuário sobre a necessidade de remover sons.
        } else {
            console.error("Erro ao salvar configurações no localStorage:", e);
        }
    }
}


// Carregar configurações do localStorage
function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings'));
    if (savedSettings) {
        volumeRange.value = savedSettings.volume !== undefined ? savedSettings.volume : 0.75;
        playMultipleCheckbox.checked = savedSettings.playMultiple !== undefined ? savedSettings.playMultiple : false;
        autokillModeCheckbox.checked = savedSettings.autokillMode !== undefined ? savedSettings.autokillMode : false;
        currentFadeOutDuration = savedSettings.currentFadeOutDuration !== undefined ? savedSettings.currentFadeOutDuration : 0;
        currentFadeInDuration = savedSettings.currentFadeInDuration !== undefined ? savedSettings.currentFadeInDuration : 0; // NOVO: Carrega a duração do fade in
        currentLanguage = savedSettings.currentLanguage || 'pt'; // Carrega idioma guardado ou padrão 'pt'

        updateVolumeDisplay();
        updateFadeOutDisplay();
        updateFadeInDisplay(); // NOVO: Atualiza o display de fade in

        // Reconstruir soundData a partir do localStorage
        if (savedSettings.sounds) {
            soundData = new Array(NUM_CELLS).fill(null); // Inicializa com nulls

            const cells = document.querySelectorAll('.sound-cell');
            savedSettings.sounds.forEach((sound, index) => {
                if (sound && sound.audioDataUrl && cells[index]) {
                    loadSoundFromDataURL(sound.audioDataUrl, cells[index], index, sound.name, sound.key, sound.color);
                } else if (cells[index]) {
                    // Garante que células vazias sejam exibidas corretamente
                    updateCellDisplay(cells[index], { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '' }, true);
                }
            });
        }
    } else {
        // Se não houver configurações salvas, inicializa os displays
        updateVolumeDisplay();
        updateFadeOutDisplay();
        updateFadeInDisplay(); // NOVO: Atualiza o display de fade in
    }
}

// Evento de teclado global
document.addEventListener('keydown', (e) => {
    const pressedKey = e.key.toLowerCase();

    // Ignora eventos de teclado se estiver a editar texto ou em inputs
    if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return;
    }

    if (e.ctrlKey) { // NOVO: Lógica para Ctrl + Números para Fade In
        if (pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault(); // Previne o comportamento padrão (ex: Ctrl+R para recarregar)
            currentFadeInDuration = parseInt(pressedKey);
            updateFadeInDisplay();
            saveSettings();
        }
    } else if (pressedKey === 'arrowup') {
        e.preventDefault();
        volumeRange.value = Math.min(1, parseFloat(volumeRange.value) + 0.05);
        updateVolumeDisplay();
        if (audioContext && audioContext.masterGainNode) {
            audioContext.masterGainNode.gain.value = volumeRange.value;
        }
        saveSettings();
    } else if (pressedKey === 'arrowdown') {
        e.preventDefault();
        volumeRange.value = Math.max(0, parseFloat(volumeRange.value) - 0.05);
        updateVolumeDisplay();
        if (audioContext && audioContext.masterGainNode) {
            audioContext.masterGainNode.gain.value = volumeRange.value;
        }
        saveSettings();
    } else if (pressedKey === 'escape') {
        stopAllSounds();
    } else if (pressedKey >= '0' && pressedKey <= '9') { // Lógica existente para Fade Out
        currentFadeOutDuration = parseInt(pressedKey);
        updateFadeOutDisplay();
        saveSettings();
    } else {
        const indexToPlay = defaultKeys.indexOf(pressedKey);
        if (indexToPlay !== -1 && soundData[indexToPlay] && soundData[indexToPlay].audioBuffer) {
            playSound(indexToPlay);
        }
    }
});

// Evento de alteração do volume via slider
volumeRange.addEventListener('input', () => {
    updateVolumeDisplay();
    if (audioContext && audioContext.masterGainNode) {
        audioContext.masterGainNode.gain.value = volumeRange.value;
    }
    saveSettings();
});

// Atualiza o display de volume
function updateVolumeDisplay() {
    volumeDisplay.textContent = `${Math.round(volumeRange.value * 100)}%`;
}

// Atualiza o display de fade out (com texto traduzido)
function updateFadeOutDisplay() {
    if (!translations[currentLanguage]) { // Fallback se traduções ainda não carregaram
        fadeOutDisplay.textContent = `Loading...`;
        return;
    }
    if (currentFadeOutDuration === 0) {
        fadeOutDisplay.textContent = `${currentFadeOutDuration}s${translations[currentLanguage].immediateStop}`;
    } else {
        fadeOutDisplay.textContent = `${currentFadeOutDuration}s`;
    }
}

// NOVO: Atualiza o display de fade in (com texto traduzido)
function updateFadeInDisplay() {
    if (!translations[currentLanguage]) { // Fallback se traduções ainda não carregaram
        fadeInDisplay.textContent = `Loading...`;
        return;
    }
    if (currentFadeInDuration === 0) {
        fadeInDisplay.textContent = `${currentFadeInDuration}s${translations[currentLanguage].immediateStop}`;
    } else {
        fadeInDisplay.textContent = `${currentFadeInDuration}s`;
    }
}


playMultipleCheckbox.addEventListener('change', () => {
    saveSettings();
});

autokillModeCheckbox.addEventListener('change', () => {
    saveSettings();
});

function stopAllSounds() {
    if (audioContext) {
        const now = audioContext.currentTime;
        const fadeDuration = 0.2;

        globalActiveGainNodes.forEach(gainNode => {
            if (gainNode) {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                gainNode.gain.linearRampToValueAtTime(0.001, now + fadeDuration);

                setTimeout(() => {
                    if (gainNode) gainNode.disconnect();
                }, fadeDuration * 1000 + 50);
            }
        });
        globalActiveGainNodes.clear();

        document.querySelectorAll('.sound-cell.active').forEach(cell => {
            cell.classList.remove('active');
        });

        soundData.forEach(sound => {
            if (sound && sound.activeGainNodes) {
                sound.activeGainNodes.clear();
            }
        });
        lastPlayedSoundIndex = null;
    }
}

stopAllSoundsBtn.addEventListener('click', stopAllSounds);

// Lógica de Carregamento de Múltiplos Sons Via Botão Geral
loadSoundsButtonGeneral.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mp3, audio/wav, audio/ogg';
    input.multiple = true;

    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        let startIndex = 0;

        for (const file of files) {
            let foundEmptyCell = false;
            for (let i = startIndex; i < NUM_CELLS; i++) {
                if (soundData[i] === null || (soundData[i] && soundData[i].audioBuffer === null)) {
                    const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                    await loadFileIntoCell(file, cell, i);
                    startIndex = i + 1;
                    foundEmptyCell = true;
                    break;
                }
            }
            if (!foundEmptyCell) {
                alert(translations[currentLanguage].alertNoEmptyCells.replace('{fileName}', file.name)); // Usa tradução
                break;
            }
        }
    };
    input.click();
});

// Adiciona event listeners para os botões de idioma
langButtons.forEach(button => {
    button.addEventListener('click', () => {
        setLanguage(button.dataset.lang);
        // Ao mudar de idioma, as células vazias precisam ser atualizadas
        document.querySelectorAll('.sound-cell.empty').forEach(cell => {
            const nameDisplay = cell.querySelector('.sound-name');
            if (nameDisplay) {
                nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
            }
        });
    });
});

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', () => {
    createSoundboardCells(); // Certifique-se de que as células são criadas antes de carregar as configurações
    loadTranslations().then(() => {
        loadSettings();
        // A lógica de setLanguage já é chamada dentro de loadTranslations e loadSettings
    });

    // Workaround para o Chrome: AudioContext precisa de uma interação do utilizador
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
