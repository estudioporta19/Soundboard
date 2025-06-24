document.addEventListener('DOMContentLoaded', () => {
    const soundboardGrid = document.getElementById('soundboard-grid');
    const rowTop = document.getElementById('row-top');
    const rowHome = document.getElementById('row-home');
    const rowBottom = document.getElementById('row-bottom');

    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const autokillModeCheckbox = document.getElementById('autokill-mode');
    const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');
    const fadeOutDisplay = document.getElementById('fadeout-display');
    const fadeInDisplay = document.getElementById('fadein-display'); // NOVO: Elemento para o display do fade in
    const langButtons = document.querySelectorAll('.lang-button');

    let audioContext;
    const soundData = []; // { name, key, audioBuffer, audioDataUrl, activeGainNodes: Set, color }
    const globalActiveGainNodes = new Set();
    let lastPlayedSoundIndex = null;
    let currentFadeOutDuration = 0; // Default para paragem imediata (0 segundos)
    let currentFadeInDuration = 0;  // NOVO: Default para início imediato (0 segundos)

    let translations = {}; // Objeto para armazenar as traduções carregadas
    let currentLanguage = 'pt'; // Idioma padrão

    // Teclas organizadas pela lógica QWERTY (top row, home row, bottom row)
    const defaultKeys = [
        'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', // Top row (10 keys)
        'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',      // Home row (9 keys)
        'z', 'x', 'c', 'v', 'b', 'n', 'm'                 // Bottom row (7 keys)
    ];
    const NUM_CELLS = defaultKeys.length; // Número de células é agora o número de teclas QWERTY

    // --- Funções de Idioma ---

    // Carrega as traduções do ficheiro JSON
    async function loadTranslations() {
        try {
            const response = await fetch('translations.json');
            translations = await response.json();
            console.log('Traduções carregadas:', translations);
            // Definir idioma inicial e aplicar
            const savedLang = localStorage.getItem('soundboardLanguage') || 'pt';
            setLanguage(savedLang);
        } catch (error) {
            console.error('Erro ao carregar traduções:', error);
            // Fallback para um objeto de tradução mínimo ou alertar o utilizador
            translations = {
                pt: {
                    title: "Erro de Carregamento",
                    mainTitle: "Erro de Carregamento",
                    volumeLabel: "Volume:",
                    playMultipleLabel: "Erro Trad.",
                    autokillLabel: "Erro Trad.",
                    loadMultipleSoundsButton: "Erro Trad.",
                    stopAllSoundsButton: "Erro Trad.",
                    fadeInLabel: "Fade In:", // NOVO: Tradução para Fade In
                    immediateStart: " (Início Imediato)", // NOVO: Tradução para Início Imediato
                    fadeOutLabel: "Fade Out:",
                    immediateStop: " (Paragem Imediata)",
                    howToUseTitle: "Erro!",
                    dragDropHelp: "Erro de tradução.",
                    clickHelp: "Erro de tradução.",
                    shortcutsHelp: "Erro de tradução.",
                    stopAllHelp: "Erro de tradução.",
                    volumeHelp: "Erro de tradução.",
                    deleteSoundHelp: "Erro de tradução.",
                    replaceSoundHelp: "Erro de tradução.",
                    renameHelp: "Erro de tradução.",
                    fadeInHelp: "Erro de tradução.", // NOVO: Tradução para ajuda do Fade In
                    fadeOutControlHelp: "Erro de tradução.",
                    playMultipleModeHelp: "Erro de tradução.",
                    autokillModeHelp: "Erro de tradução.",
                    alertInvalidFile: "Invalid file type.",
                    alertLoadError: "Could not load audio.",
                    alertDecodeError: "Error decoding audio.",
                    alertNoEmptyCells: "No more empty cells.",
                    cellEmptyText: "Click to load sound",
                    cellNoName: "No Name",
                    cellEmptyDefault: "Empty"
                },
                en: { // Adicionar um fallback mínimo para EN e IT também, se não existirem
                    title: "Loading Error",
                    mainTitle: "Loading Error",
                    volumeLabel: "Volume:",
                    playMultipleLabel: "Trad. Error",
                    autokillLabel: "Trad. Error",
                    loadMultipleSoundsButton: "Trad. Error",
                    stopAllSoundsButton: "Trad. Error",
                    fadeInLabel: "Fade In:",
                    immediateStart: " (Immediate Start)",
                    fadeOutLabel: "Fade Out:",
                    immediateStop: " (Immediate Stop)",
                    howToUseTitle: "Error!",
                    dragDropHelp: "Translation error.",
                    clickHelp: "Translation error.",
                    shortcutsHelp: "Translation error.",
                    stopAllHelp: "Translation error.",
                    volumeHelp: "Translation error.",
                    deleteSoundHelp: "Translation error.",
                    replaceSoundHelp: "Translation error.",
                    renameHelp: "Translation error.",
                    fadeInHelp: "Translation error.",
                    fadeOutControlHelp: "Translation error.",
                    playMultipleModeHelp: "Translation error.",
                    autokillModeHelp: "Translation error.",
                    alertInvalidFile: "Invalid file type.",
                    alertLoadError: "Could not load audio.",
                    alertDecodeError: "Error decoding audio.",
                    alertNoEmptyCells: "No more empty cells.",
                    cellEmptyText: "Click to load sound",
                    cellNoName: "No Name",
                    cellEmptyDefault: "Empty"
                },
                it: {
                    title: "Errore di Caricamento",
                    mainTitle: "Errore di Caricamento",
                    volumeLabel: "Volume:",
                    playMultipleLabel: "Errore Trad.",
                    autokillLabel: "Errore Trad.",
                    loadMultipleSoundsButton: "Errore Trad.",
                    stopAllSoundsButton: "Errore Trad.",
                    fadeInLabel: "Fade In:",
                    immediateStart: " (Avvio Immediato)",
                    fadeOutLabel: "Fade Out:",
                    immediateStop: " (Arresto Immediato)",
                    howToUseTitle: "Errore!",
                    dragDropHelp: "Errore di traduzione.",
                    clickHelp: "Errore di traduzione.",
                    shortcutsHelp: "Errore di traduzione.",
                    stopAllHelp: "Errore di traduzione.",
                    volumeHelp: "Errore di traduzione.",
                    deleteSoundHelp: "Errore di traduzione.",
                    replaceSoundHelp: "Errore di traduzione.",
                    renameHelp: "Errore di traduzione.",
                    fadeInHelp: "Errore di traduzione.",
                    fadeOutControlHelp: "Errore di traduzione.",
                    playMultipleModeHelp: "Errore di traduzione.",
                    autokillModeHelp: "Errore di traduzione.",
                    alertInvalidFile: "Invalid file type.",
                    alertLoadError: "Could not load audio.",
                    alertDecodeError: "Error decoding audio.",
                    alertNoEmptyCells: "No more empty cells.",
                    cellEmptyText: "Click to load sound",
                    cellNoName: "No Name",
                    cellEmptyDefault: "Empty"
                }
            };
            setLanguage('pt'); // Tenta definir PT como fallback
        }
    }

    // Aplica as traduções à página
    function setLanguage(lang) {
        if (!translations[lang]) {
            console.warn(`Idioma ${lang} não encontrado. Usando PT como fallback.`);
            lang = 'pt';
        }
        currentLanguage = lang;
        localStorage.setItem('soundboardLanguage', lang);

        document.querySelector('title').textContent = translations[lang].title;

        // Traduzir elementos com data-key
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.dataset.key;
            if (translations[lang][key]) {
                if (element.tagName === 'INPUT' && element.type === 'range') {
                    // Range inputs não têm textContent
                } else if (element.tagName === 'INPUT' && (element.type === 'checkbox' || element.type === 'radio')) {
                    // Checkboxes/radios não têm textContent, a label associada é que tem
                } else if (element.tagName === 'BUTTON') {
                    element.textContent = translations[lang][key];
                } else if (element.tagName === 'LABEL') {
                    element.textContent = translations[lang][key];
                } else if (element.tagName === 'LI') {
                    element.innerHTML = translations[lang][key]; // Usar innerHTML para manter <kbd> e <strong>
                } else {
                    element.textContent = translations[lang][key];
                }
            }
        });

        // Atualizar display de fade out e fade in com texto traduzido
        updateFadeOutDisplay();
        updateFadeInDisplay(); // NOVO: Atualiza o display do fade in
        
        // Atualizar texto das células vazias
        document.querySelectorAll('.sound-cell.empty').forEach(cell => {
            const emptyTextElement = cell.querySelector('.sound-name');
            if (emptyTextElement) {
                emptyTextElement.textContent = translations[currentLanguage].cellEmptyDefault;
            }
            // Para o pseudo-elemento ::before, não podemos mudar diretamente via JS.
            // Isso requer uma pequena adição ao CSS ou uma solução JS mais complexa.
            // Por enquanto, o 'Clique para carregar som' no :before não será traduzido diretamente.
            // Se for essencial, podemos substituir o :before por um span dentro da célula.
        });


        // Atualizar botões de idioma
        langButtons.forEach(button => {
            if (button.dataset.lang === lang) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // --- Fim das Funções de Idioma ---

    // Resto do código existente...

    // Função para gerar uma cor de fundo aleatória em HSL para harmonia
    function getRandomHSLColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 20) + 70; // 70-90%
        const lightness = Math.floor(Math.random() * 20) + 40; // 40-60%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    // Inicializa o AudioContext
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.masterGainNode = audioContext.createGain();
            audioContext.masterGainNode.connect(audioContext.destination);
            audioContext.masterGainNode.gain.value = volumeRange.value;
        }
    }

    // Carregar configurações do localStorage
    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        
        volumeRange.value = savedSettings.volume !== undefined ? savedSettings.volume : 0.75;
        playMultipleCheckbox.checked = savedSettings.playMultiple !== undefined ? savedSettings.playMultiple : false;
        autokillModeCheckbox.checked = savedSettings.autokillMode !== undefined ? savedSettings.autokillMode : false;
        currentFadeOutDuration = savedSettings.currentFadeOutDuration !== undefined ? savedSettings.currentFadeOutDuration : 0;
        currentFadeInDuration = savedSettings.currentFadeInDuration !== undefined ? savedSettings.currentFadeInDuration : 0; // NOVO: Carrega a duração do fade in
        
        updateVolumeDisplay();
        updateFadeOutDisplay(); // Chama após carregar settings
        updateFadeInDisplay();  // NOVO: Chama após carregar settings

        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i); 
            
            const fixedKey = defaultKeys[i];

            if (cellData && cellData.audioDataUrl) {
                const color = cellData.color || getRandomHSLColor();
                loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, fixedKey, color);
            } else {
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '' }, true);
            }
        }
    }

    // Guardar configurações no localStorage
    function saveSettings() {
        const settingsToSave = {
            volume: parseFloat(volumeRange.value),
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            currentFadeOutDuration: currentFadeOutDuration, 
            currentFadeInDuration: currentFadeInDuration, // NOVO: Salva a duração do fade in
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null, 
                audioDataUrl: data ? data.audioDataUrl : null,
                color: data ? data.color : null
            }))
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
    }

    // Cria e adiciona uma célula da soundboard à linha QWERTY correta
    function createSoundCell(index) {
        const cell = document.createElement('div');
        cell.classList.add('sound-cell', 'empty');
        cell.dataset.index = index;

        // Botão de Substituir Som
        const replaceButton = document.createElement('button');
        replaceButton.classList.add('replace-sound-button');
        replaceButton.innerHTML = '<span class="material-symbols-outlined">upload_file</span>';
        replaceButton.title = translations[currentLanguage].replaceSoundHelp.replace(/<[^>]*>/g, ''); // Remover HTML da dica
        cell.appendChild(replaceButton);

        // Botão de Apagar
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '❌'; 
        deleteButton.title = translations[currentLanguage].deleteSoundHelp.replace(/<[^>]*>/g, ''); // Remover HTML da dica
        cell.appendChild(deleteButton);

        const nameDisplay = document.createElement('div');
        nameDisplay.classList.add('sound-name');
        nameDisplay.contentEditable = true;
        nameDisplay.spellcheck = false;
        nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault; // Usa tradução
        nameDisplay.title = translations[currentLanguage].renameHelp.replace(/<[^>]*>/g, ''); // Usa tradução
        cell.appendChild(nameDisplay);

        // Elemento para exibir a tecla no rodapé da célula
        const keyDisplayBottom = document.createElement('div');
        keyDisplayBottom.classList.add('key-display-bottom');
        keyDisplayBottom.textContent = defaultKeys[index] ? defaultKeys[index].toUpperCase() : '';
        cell.appendChild(keyDisplayBottom);

        // Adiciona a célula à linha QWERTY correta
        if (index >= 0 && index < 10) { 
            rowTop.appendChild(cell);
        } else if (index >= 10 && index < 19) { 
            rowHome.appendChild(cell);
        } else if (index >= 19 && index < 26) { 
            rowBottom.appendChild(cell);
        } else {
            console.warn(`Índice de célula fora do esperado: ${index}`);
            soundboardGrid.appendChild(cell); 
        }

        setupCellEvents(cell, index); 

        soundData[index] = null; 

        return cell;
    }

    // Configura os eventos para uma célula
    function setupCellEvents(cell, index) {
        // Drag and Drop
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
            const file = e.dataTransfer.files[0];
            if (file && (file.type === 'audio/wav' || file.type === 'audio/mp3' || file.type === 'audio/ogg')) {
                loadFileIntoCell(file, cell, index);
            } else {
                alert(translations[currentLanguage].alertInvalidFile); // Usa tradução
            }
        });

        // Click para tocar ou carregar som
        cell.addEventListener('click', (e) => {
            if (e.target.closest('.delete-button') || 
                e.target.closest('.replace-sound-button') ||
                e.target.closest('.sound-name')) {
                e.stopPropagation(); 
                return;
            }

            if (cell.classList.contains('empty')) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/mp3, audio/wav, audio/ogg';
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        await loadFileIntoCell(file, cell, index);
                    }
                };
                input.click();
            } else {
                playSound(index);
            }
        });

        // Edição do nome
        const nameDisplay = cell.querySelector('.sound-name');
        nameDisplay.addEventListener('blur', () => {
            if (soundData[index]) {
                soundData[index].name = nameDisplay.textContent.trim() || translations[currentLanguage].cellNoName; // Usa tradução
                nameDisplay.textContent = soundData[index].name;
                saveSettings();
            }
        });
        nameDisplay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameDisplay.blur();
            }
        });

        // Lógica para o botão de apagar (click curto vs. click longo para fade out)
        const deleteButton = cell.querySelector('.delete-button');
        let pressTimer;
        const longPressDuration = 500; // 0.5 segundos

        deleteButton.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            pressTimer = setTimeout(() => {
                if (soundData[index] && soundData[index].audioBuffer) {
                    fadeoutSound(index, currentFadeOutDuration); // Agora usa currentFadeOutDuration
                }
                pressTimer = null; 
            }, longPressDuration);
        });

        deleteButton.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            if (pressTimer !== null) { 
                clearTimeout(pressTimer);
                if (e.button === 0 && !cell.classList.contains('empty')) { 
                    clearSoundCell(index, 0.1); // Clique curto apaga com fade out rápido
                }
            }
            pressTimer = null; 
        });

        deleteButton.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer); 
            pressTimer = null;
        });

        deleteButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Lógica para o botão de substituir som
        const replaceButton = cell.querySelector('.replace-sound-button');
        replaceButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/mp3, audio/wav, audio/ogg';
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    await loadFileIntoCell(file, cell, index);
                }
            };
            input.click();
        });
    }

    // Carrega um ficheiro de audio numa célula específica
    async function loadFileIntoCell(file, cell, index, nameOverride = null) {
        initAudioContext();

        const reader = new FileReader();
        reader.onload = async (e) => {
            const audioDataUrl = e.target.result;
            const arrayBuffer = e.target.result;

            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const defaultName = nameOverride || file.name.replace(/\.[^/.]+$/, "");
                const fixedKey = defaultKeys[index]; 

                const cellColor = getRandomHSLColor();
                cell.style.backgroundColor = cellColor; 

                if (soundData[index]) {
                    clearSoundData(index);
                }
                
                soundData[index] = {
                    name: defaultName,
                    key: fixedKey, 
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl,
                    activeGainNodes: new Set(),
                    color: cellColor 
                };
                updateCellDisplay(cell, soundData[index], false);
                saveSettings();
            } catch (error) {
                console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                alert(translations[currentLanguage].alertLoadError.replace('{fileName}', file.name)); // Usa tradução
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '' }, true);
                soundData[index] = null;
                saveSettings();
            }
        };
        reader.readAsArrayBuffer(file);
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
                playActualSound(sound, index, currentFadeInDuration); // NOVO: Passa a duração do fade in
                lastPlayedSoundIndex = index;
            }).catch(e => console.error('Erro ao retomar AudioContext:', e));
        } else {
            playActualSound(sound, index, currentFadeInDuration); // NOVO: Passa a duração do fade in
            lastPlayedSoundIndex = index;
        }
    }

    // Função que realmente toca o som, agora com fade-in
    function playActualSound(sound, index, fadeInDuration = 0) { // NOVO: Adicionado fadeInDuration
        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;

        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.masterGainNode);
        source.connect(gainNode);

        // Aplica o fade-in
        const now = audioContext.currentTime;
        if (fadeInDuration > 0) {
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(1, now + fadeInDuration); // Vai de 0 ao volume máximo em fadeInDuration segundos
        } else {
            gainNode.gain.setValueAtTime(1, now); // Início imediato, volume máximo
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
            sound.activeGainNodes.forEach(gN => {
                if (gN !== gainNode) {
                    gN.gain.cancelScheduledValues(audioContext.currentTime);
                    gN.gain.setValueAtTime(gN.gain.value, audioContext.currentTime);
                    gN.gain.linearRampToValueAtTime(0.001, audioContext.currentTime + 0.1); 
                    setTimeout(() => {
                        gN.disconnect();
                        globalActiveGainNodes.delete(gN);
                    }, 150);
                }
            });
            sound.activeGainNodes.clear(); 
            sound.activeGainNodes.add(gainNode);
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

    // Evento de teclado global
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            return;
        }
        
        if (pressedKey === 'arrowup') {
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
        } else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') { // NOVO: Ctrl + número para fade in
            e.preventDefault(); // Evita comportamentos padrão do navegador
            currentFadeInDuration = parseInt(pressedKey);
            updateFadeInDisplay();
            saveSettings();
        } else if (pressedKey >= '0' && pressedKey <= '9') { // Número sozinho para fade out
            e.preventDefault(); // Evita comportamentos padrão do navegador
            currentFadeOutDuration = parseInt(pressedKey);
            updateFadeOutDisplay();
            saveSettings();
        }
        else {
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

    // Atualiza o display de fade in (com texto traduzido)
    function updateFadeInDisplay() {
        if (!translations[currentLanguage]) { // Fallback se traduções ainda não carregaram
            fadeInDisplay.textContent = `Loading...`;
            return;
        }
        if (currentFadeInDuration === 0) {
            fadeInDisplay.textContent = `${currentFadeInDuration}s${translations[currentLanguage].immediateStart || ' (Immediate Start)'}`;
        } else {
            fadeInDisplay.textContent = `${currentFadeInDuration}s`;
        }
    }

    // Atualiza o display de fade out (com texto traduzido)
    function updateFadeOutDisplay() {
        if (!translations[currentLanguage]) { // Fallback se traduções ainda não carregaram
            fadeOutDisplay.textContent = `Loading...`; 
            return;
        }
        if (currentFadeOutDuration === 0) {
            fadeOutDisplay.textContent = `${currentFadeOutDuration}s${translations[currentLanguage].immediateStop || ' (Immediate Stop)'}`;
        } else {
            fadeOutDisplay.textContent = `${currentFadeOutDuration}s`;
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
            // pois o texto "Vazio" ou "Clique para carregar som" pode mudar.
            document.querySelectorAll('.sound-cell.empty').forEach(cell => {
                const nameDisplay = cell.querySelector('.sound-name');
                if (nameDisplay) {
                    nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
                }
            });
        });
    });

    // Inicialização: primeiro carrega as traduções, depois as configurações e cria as células
    loadTranslations().then(() => {
        loadSettings(); 
        // Agora que as traduções e settings estão carregadas, garantimos que a UI está correta
        setLanguage(currentLanguage); // Re-aplica a linguagem para ter certeza de que tudo foi traduzido
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
