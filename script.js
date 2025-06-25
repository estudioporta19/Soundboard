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
    const fadeOutRange = document.getElementById('fadeOut-range');
    const fadeOutDisplay = document.getElementById('fadeout-display');
    const fadeInRange = document.getElementById('fadeIn-range');
    const fadeInDisplay = document.getElementById('fadeIn-display');
    const langButtons = document.querySelectorAll('.lang-button');

    let audioContext;
    const soundData = []; // { name, key, audioBuffer, audioDataUrl, activePlayingInstances: Set<{source: AudioBufferSourceNode, gain: GainNode}>, color, isLooping, isCued }
    const globalActivePlayingInstances = new Set(); // Armazena {source, gainNode} de todas as instâncias a tocar
    let lastPlayedSoundIndex = null; // Este será o "cursor" para Space/Ctrl+Space
    let currentFadeOutDuration = 0;
    let currentFadeInDuration = 0;
    let cuedSounds = new Set(); // Armazena os índices das células em "cue"

    let translations = {};
    let currentLanguage = 'pt';

    const defaultKeys = [
        'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
        'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
        'z', 'x', 'c', 'v', 'b', 'n', 'm'
    ];
    const NUM_CELLS = defaultKeys.length;

    // --- Funções de Idioma ---

    async function loadTranslations() {
        try {
            const response = await fetch('translations.json');
            translations = await response.json();
            console.log('Traduções carregadas:', translations);
            const savedLang = localStorage.getItem('soundboardLanguage') || 'pt';
            setLanguage(savedLang);
        } catch (error) {
            console.error('Erro ao carregar traduções:', error);
            translations = {
                pt: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Reproduzir Múltiplos", autokillLabel: "Auto-Kill Anterior", loadMultipleSoundsButton: "Carregar Múltiplos Sons", stopAllSoundsButton: "Parar Todos os Sons (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Início Imediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Paragem Imediata)", howToUseTitle: "Como Usar:", dragDropHelp: "<strong>Arrastar e Largar:</strong> Arraste ficheiros de áudio (MP3, WAV, OGG) para as células para as preencher.", clickHelp: "<strong>Clicar:</strong> Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.", shortcutsHelp: "<strong>Atalhos de Teclado:</strong> Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: Q para a primeira célula).", stopAllHelp: "<strong>Parar Sons:</strong> Pressione <kbd>ESC</kbd> para parar todos os sons a tocar.", volumeHelp: "<strong>Ajustar Volume:</strong> Use o slider de volume ou as teclas <kbd>⬆️</kbd> e <kbd>⬇️</kbd> para controlar o volume global.", deleteSoundHelp: "<strong>Apagar Som:</strong> Clique no <span style=\"font-size:1.1em;\">❌</span> no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga; um clique longo (>0.5s) faz fade out.*", replaceSoundHelp: "<strong>Substituir Som:</strong> Clique no <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> para carregar um novo som para a célula.", renameHelp: "<strong>Mudar Nome:</strong> Clique no nome do som para editá-lo.", fadeInHelp: "<strong>Controlar Fade In:</strong> Use o slider de Fade In, ou as teclas <kbd>Ctrl</kbd> + teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade in em segundos.", fadeOutControlHelp: "<strong>Controlar Fade Out:</strong> Use o slider de Fade Out, ou as teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade out em segundos.", playMultipleModeHelp: "<strong>Modo Reproduzir Múltiplos:</strong> Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.", autokillModeHelp: "<strong>Modo Auto-Kill Anterior:</strong> Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.", alertInvalidFile: "Tipo de ficheiro inválido. Por favor, arraste ficheiros de áudio (MP3, WAV, OGG).", alertLoadError: "Não foi possível carregar o áudio '{fileName}'.", alertDecodeError: "Erro ao descodificar o áudio '{soundName}'.", alertNoEmptyCells: "Não há mais células vazias para carregar o ficheiro '{fileName}'.", cellEmptyText: "Clique para carregar o som", cellNoName: "Sem Nome", cellEmptyDefault: "Vazio", loopButtonTitle: "Ativar/Desativar Loop", cueHelp: "<strong>CUE / GO:</strong> Pressione <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para 'cue' (marcar) um som. Pressione <kbd>Enter</kbd> para tocar todos os sons em 'cue' com fade-in. Pressione <kbd>Shift</kbd> + <kbd>Enter</kbd> para parar todos os sons em 'cue' com fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Pressione <kbd>Ctrl</kbd> + clique na célula para adicionar/remover um som do 'cue'.", removeCueHelp: "<strong>Remover CUE:</strong> Pressione <kbd>Alt</kbd> + <kbd>Enter</kbd> para remover todos os sons do 'cue' sem os parar.",
                },
                en: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Play Multiple", autokillLabel: "Auto-Kill Previous", loadMultipleSoundsButton: "Load Multiple Sounds", stopAllSoundsButton: "Stop All Sounds (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Immediate Start)", fadeOutLabel: "Fade Out:", immediateStop: " (Immediate Stop)", howToUseTitle: "How To Use:", dragDropHelp: "<strong>Drag & Drop:</strong> Drag audio files (MP3, WAV, OGG) onto cells to fill them.", clickHelp: "<strong>Click:</strong> Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.", shortcutsHelp: "<strong>Keyboard Shortcuts:</strong> Press the corresponding key on your keyboard to play the sound. (e.g., Q for the first cell).", stopAllHelp: "<strong>Stop Sounds:</strong> Press <kbd>ESC</kbd> to stop all playing sounds.", volumeHelp: "<strong>Adjust Volume:</strong> Use the volume slider or the <kbd>⬆️</kbd> and <kbd>⬇️</kbd> keys to control global volume.", deleteSoundHelp: "<strong>Delete Sound:</strong> Click the <span style=\"font-size:1.1em;\">❌</span> in the top right corner of a cell to clear it. *A quick click deletes; a long click (>0.5s) fades out.*", replaceSoundHelp: "<strong>Replace Sound:</strong> Click the <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> to upload a new sound to the cell.", renameHelp: "<strong>Rename Sound:</strong> Click the sound's name to edit it.", fadeInHelp: "<strong>Control Fade In:</strong> Use the Fade In slider, or press <kbd>Ctrl</kbd> + number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-in duration in seconds.", fadeOutControlHelp: "<strong>Control Fade Out:</strong> Use the Fade Out slider, or press number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-out duration in seconds.", playMultipleModeHelp: "<strong>Play Multiple Mode:</strong> Allows multiple sounds to play simultaneously if checked.", autokillModeHelp: "<strong>Auto-Kill Previous Mode:</strong> When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.", alertInvalidFile: "Invalid file type. Please drag audio files (MP3, WAV, OGG).", alertLoadError: "Could not load audio '{fileName}'.", alertDecodeError: "Error decoding audio '{soundName}'.", alertNoEmptyCells: "No more empty cells to load file '{fileName}'.", cellEmptyText: "Click to load sound", cellNoName: "No Name", cellEmptyDefault: "Empty", loopButtonTitle: "Loop (Toggle)", cueHelp: "<strong>CUE / GO:</strong> Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to 'cue' (mark) a sound. Press <kbd>Enter</kbd> to play all 'cued' sounds with fade-in. Press <kbd>Shift</kbd> + <kbd>Enter</kbd> to stop all 'cued' sounds with fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Press <kbd>Ctrl</kbd> + click on the cell to add/remove a sound from 'cue'.", removeCueHelp: "<strong>Remove CUE:</strong> Press <kbd>Alt</kbd> + <kbd>Enter</kbd> to remove all cued sounds without stopping them.",
                },
                it: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Riproduci Multipli", autokillLabel: "Auto-Stop Precedente", loadMultipleSoundsButton: "Carica Più Suoni", stopAllSoundsButton: "Ferma Tutti i Suoni (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Avvio Immediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Arresto Immediato)", howToUseTitle: "Come Usare:", dragDropHelp: "<strong>Trascina e Rilascia:</strong> Trascina file audio (MP3, WAV, OGG) sulle celle per riempirle.", clickHelp: "<strong>Clicca:</strong> Clicca una cella vuota per aprire una finestra di selezione file. Clicca una cella piena per riprodurre il suono.", shortcutsHelp: "<strong>Scorciatoie da Tastiera:</strong> Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: Q per la prima cella).", stopAllHelp: "<strong>Ferma Suoni:</strong> Premi <kbd>ESC</kbd> per fermare tutti i suoni in riproduzione.", volumeHelp: "<strong>Regola Volume:</strong> Usa il cursore del volume o i tasti <kbd>⬆️</kbd> e <kbd>⬇️</kbd> per controllare il volume globale.", deleteSoundHelp: "<strong>Elimina Suono:</strong> Clicca sulla <span style=\"font-size:1.1em;\">❌</span> nell'angolo in alto a destra di una cella per svuotarla. *Un clic rapido elimina; un clic lungo (>0.5s) esegue il fade out.*", replaceSoundHelp: "<strong>Sostituisci Suono:</strong> Clicca su <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> per caricare un nuovo suono nella cella.", renameHelp: "<strong>Rinomina Suono:</strong> Clicca sul nome del suono per modificarlo.", fadeInHelp: "<strong>Controlla Fade In:</strong> Usa lo slider Fade In, o premi <kbd>Ctrl</kbd> + tasti numerici <kbd>0</kbd>-<kbd>9</kbd> per impostare la durata del fade-in in secondi.", fadeOutControlHelp: "<strong>Controlla Fade Out:</strong> Usa lo slider Fade Out, o premi i tasti numerici <kbd>0</kbd>-<kbd>9</kbd> per impostare la durata del fade-out in secondi.", playMultipleModeHelp: "<strong>Modalità Riproduci Multipli:</strong> Permette a più suoni di essere riprodotti contemporaneamente se la casella è selezionata.", autokillModeHelp: "<strong>Modalità Auto-Stop Precedente:</strong> Quando viene riprodotto un nuovo suono, il suono precedentemente attivo (se presente) verrà fermato con un rapido fade out.", alertInvalidFile: "Tipo di file non valido. Si prega di trascinare file audio (MP3, WAV, OGG).", alertLoadError: "Impossibile caricare l'audio '{fileName}'.", alertDecodeError: "Errore durante la decodifica dell'audio '{soundName}'.", alertNoEmptyCells: "Non ci sono più celle vuote per caricare il file '{fileName}'.", cellEmptyText: "Clicca per caricare il suono", cellNoName: "Senza Nome", cellEmptyDefault: "Vuoto", loopButtonTitle: "Loop (Attiva/Disattiva)", cueHelp: "<strong>CUE / GO:</strong> Premi <kbd>Ctrl</kbd> + <kbd>Invio</kbd> per 'cue' (segnare) un suono. Premi <kbd>Invio</kbd> per riprodurre tutti i suoni in 'cue' con fade-in. Premi <kbd>Shift</kbd> + <kbd>Invio</kbd> per fermare tutti i suoni in 'cue' con fade-out.", cueSingleHelp: "<strong>CUE Individuale:</strong> Premi <kbd>Ctrl</kbd> + clic sulla cella per aggiungere/rimuovere un suono dal 'cue'.", removeCueHelp: "<strong>Rimuovi CUE:</strong> Premi <kbd>Alt</kbd> + <kbd>Invio</kbd> per rimuovere tutti i suoni in cue senza fermarli.",
                }
            };
            setLanguage('pt');
        }
    }

    function setLanguage(lang) {
        if (!translations[lang]) {
            console.warn(`Idioma ${lang} não encontrado. Usando PT como fallback.`);
            lang = 'pt';
        }
        currentLanguage = lang;
        localStorage.setItem('soundboardLanguage', lang);

        document.querySelector('title').textContent = translations[lang].title;

        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.dataset.key;
            if (translations[lang][key]) {
                if (element.tagName === 'INPUT' && element.type === 'range') {
                } else if (element.tagName === 'INPUT' && (element.type === 'checkbox' || element.type === 'radio')) {
                } else if (element.tagName === 'BUTTON') {
                    element.textContent = translations[lang][key];
                } else if (element.tagName === 'LABEL') {
                    element.textContent = translations[lang][key];
                } else if (element.tagName === 'LI') {
                    element.innerHTML = translations[lang][key];
                } else {
                    element.textContent = translations[lang][key];
                }
            }
        });

        updateFadeOutDisplay();
        updateFadeInDisplay();

        document.querySelectorAll('.sound-cell').forEach(cell => {
            const index = parseInt(cell.dataset.index);
            const data = soundData[index];

            const nameDisplay = cell.querySelector('.sound-name');
            if (nameDisplay) {
                nameDisplay.textContent = data && data.name ? data.name : translations[currentLanguage].cellEmptyDefault;
                nameDisplay.title = translations[currentLanguage].renameHelp.replace(/<[^>]*>/g, '');
            }

            const deleteButton = cell.querySelector('.delete-button');
            if (deleteButton) {
                deleteButton.title = translations[currentLanguage].deleteSoundHelp.replace(/<[^>]*>/g, '');
            }
            const replaceButton = cell.querySelector('.replace-sound-button');
            if (replaceButton) {
                replaceButton.title = translations[currentLanguage].replaceSoundHelp.replace(/<[^>]*>/g, '');
            }
            const loopButton = cell.querySelector('.loop-button');
            if (loopButton) {
                loopButton.title = translations[currentLanguage].loopButtonTitle || 'Loop (Toggle)';
            }

            if (data && data.isLooping) {
                loopButton.classList.add('active');
            } else if (loopButton) {
                loopButton.classList.remove('active');
            }
        });

        langButtons.forEach(button => {
            if (button.dataset.lang === lang) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // --- Fim das Funções de Idioma ---

    function getRandomHSLColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 20) + 70;
        const lightness = Math.floor(Math.random() * 20) + 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.masterGainNode = audioContext.createGain();
            audioContext.masterGainNode.connect(audioContext.destination);
            audioContext.masterGainNode.gain.value = volumeRange.value;
        }
    }

    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];

        volumeRange.value = savedSettings.volume !== undefined ? savedSettings.volume : 0.75;
        playMultipleCheckbox.checked = savedSettings.playMultiple !== undefined ? savedSettings.playMultiple : false;
        autokillModeCheckbox.checked = savedSettings.autokillMode !== undefined ? savedSettings.autokillMode : false;
        fadeInRange.value = savedSettings.currentFadeInDuration !== undefined ? savedSettings.currentFadeInDuration : 0;
        fadeOutRange.value = savedSettings.currentFadeOutDuration !== undefined ? savedSettings.currentFadeOutDuration : 0;
        currentFadeInDuration = parseFloat(fadeInRange.value);
        currentFadeOutDuration = parseFloat(fadeOutRange.value);

        updateVolumeDisplay();
        updateFadeOutDisplay();
        updateFadeInDisplay();

        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i);

            const fixedKey = defaultKeys[i];

            if (cellData && cellData.audioDataUrl) {
                const color = cellData.color || getRandomHSLColor();
                const isLooping = cellData.isLooping !== undefined ? cellData.isLooping : false;
                loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, fixedKey, color, isLooping);
            } else {
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '', isLooping: false }, true);
            }
        }
    }

    function saveSettings() {
        const settingsToSave = {
            volume: parseFloat(volumeRange.value),
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            currentFadeOutDuration: parseFloat(fadeOutRange.value),
            currentFadeInDuration: parseFloat(fadeInRange.value),
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null,
                audioDataUrl: data ? data.audioDataUrl : null,
                color: data ? data.color : null,
                isLooping: data ? data.isLooping : false,
                isCued: data ? data.isCued : false
            }))
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
    }

    function createSoundCell(index) {
        const cell = document.createElement('div');
        cell.classList.add('sound-cell', 'empty');
        cell.dataset.index = index;

        const replaceButton = document.createElement('button');
        replaceButton.classList.add('replace-sound-button');
        replaceButton.innerHTML = '<span class="material-symbols-outlined">upload_file</span>';
        replaceButton.title = translations[currentLanguage].replaceSoundHelp.replace(/<[^>]*>/g, '');
        cell.appendChild(replaceButton);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '❌';
        deleteButton.title = translations[currentLanguage].deleteSoundHelp.replace(/<[^>]*>/g, '');
        cell.appendChild(deleteButton);

        const loopButton = document.createElement('button');
        loopButton.classList.add('loop-button');
        loopButton.innerHTML = '<span class="material-symbols-outlined">loop</span>';
        loopButton.title = translations[currentLanguage].loopButtonTitle || 'Loop (Toggle)';
        cell.appendChild(loopButton);

        const nameDisplay = document.createElement('div');
        nameDisplay.classList.add('sound-name');
        nameDisplay.contentEditable = true;
        nameDisplay.spellcheck = false;
        nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
        nameDisplay.title = translations[currentLanguage].renameHelp.replace(/<[^>]*>/g, '');
        cell.appendChild(nameDisplay);

        const keyDisplayBottom = document.createElement('div');
        keyDisplayBottom.classList.add('key-display-bottom');
        keyDisplayBottom.textContent = defaultKeys[index] ? defaultKeys[index].toUpperCase() : '';
        cell.appendChild(keyDisplayBottom);

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

    function setupCellEvents(cell, index) {
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
                alert(translations[currentLanguage].alertInvalidFile);
            }
        });

        cell.addEventListener('click', (e) => {
            if (e.ctrlKey) {
                e.stopPropagation();
                toggleCue(index);
                return;
            }

            if (e.target.closest('.delete-button') ||
                e.target.closest('.replace-sound-button') ||
                e.target.closest('.loop-button') ||
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

        const nameDisplay = cell.querySelector('.sound-name');
        nameDisplay.addEventListener('blur', () => {
            if (soundData[index]) {
                soundData[index].name = nameDisplay.textContent.trim() || translations[currentLanguage].cellNoName;
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

        const deleteButton = cell.querySelector('.delete-button');
        let pressTimer;
        const longPressDuration = 500;

        deleteButton.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            pressTimer = setTimeout(() => {
                if (soundData[index] && soundData[index].audioBuffer) {
                    fadeoutSound(index, currentFadeOutDuration);
                }
                pressTimer = null;
            }, longPressDuration);
        });

        deleteButton.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            if (pressTimer !== null) {
                clearTimeout(pressTimer);
                if (e.button === 0 && !cell.classList.contains('empty')) {
                    clearSoundCell(index, 0.1);
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

        const loopButton = cell.querySelector('.loop-button');
        loopButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (soundData[index]) {
                soundData[index].isLooping = !soundData[index].isLooping;
                loopButton.classList.toggle('active', soundData[index].isLooping);
                saveSettings();

                soundData[index].activePlayingInstances.forEach(instance => {
                    instance.source.loop = soundData[index].isLooping;
                });
            }
        });
    }

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

                if (soundData[index]) {
                    clearSoundData(index);
                }

                soundData[index] = {
                    name: defaultName,
                    key: fixedKey,
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl,
                    activePlayingInstances: new Set(),
                    color: cellColor,
                    isLooping: false,
                    isCued: false
                };
                updateCellDisplay(cell, soundData[index], false);
                saveSettings();
            } catch (error) {
                console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                alert(translations[currentLanguage].alertLoadError.replace('{fileName}', file.name));
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '', isLooping: false, isCued: false }, true);
                soundData[index] = null;
                saveSettings();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function loadSoundFromDataURL(dataUrl, cell, index, name, key, color, isLoopingState) {
        initAudioContext();

        try {
            const base64Audio = dataUrl.split(',')[1];
            const arrayBuffer = base64ToArrayBuffer(base64Audio);
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const fixedKey = defaultKeys[index];

            soundData[index] = {
                name: name || translations[currentLanguage].cellNoName,
                key: fixedKey,
                audioBuffer: audioBuffer,
                audioDataUrl: dataUrl,
                activePlayingInstances: new Set(),
                color: color,
                isLooping: isLoopingState,
                isCued: false
            };
            updateCellDisplay(cell, soundData[index], false);
        } catch (error) {
            console.error('Erro ao decodificar áudio do Data URL:', error);
            alert(translations[currentLanguage].alertDecodeError.replace('{soundName}', name || ''));
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '', isLooping: false, isCued: false }, true);
            soundData[index] = null;
            saveSettings();
        }
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function updateCellDisplay(cell, data, isEmpty) {
        const nameDisplay = cell.querySelector('.sound-name');
        const keyDisplayBottom = cell.querySelector('.key-display-bottom');
        const deleteButton = cell.querySelector('.delete-button');
        const replaceButton = cell.querySelector('.replace-sound-button');
        const loopButton = cell.querySelector('.loop-button');

        if (isEmpty) {
            cell.classList.add('empty');
            cell.classList.remove('cued', 'active');
            nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
            nameDisplay.contentEditable = false;
            deleteButton.style.display = 'none';
            replaceButton.style.display = 'none';
            loopButton.style.display = 'none';
            cell.style.backgroundColor = 'transparent';
            loopButton.classList.remove('active');
            if (data && data.isCued) {
                cuedSounds.delete(parseInt(cell.dataset.index));
            }
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || translations[currentLanguage].cellNoName;
            nameDisplay.contentEditable = true;
            deleteButton.style.display = 'flex';
            replaceButton.style.display = 'flex';
            loopButton.style.display = 'flex';
            cell.style.backgroundColor = data.color;
            loopButton.classList.toggle('active', data.isLooping);
            if (data.isCued) {
                cell.classList.add('cued');
                cuedSounds.add(parseInt(cell.dataset.index));
            } else {
                cell.classList.remove('cued');
                cuedSounds.delete(parseInt(cell.dataset.index));
            }
        }
        keyDisplayBottom.textContent = defaultKeys[cell.dataset.index] ? defaultKeys[cell.dataset.index].toUpperCase() : '';
    }

    /**
     * Toca um som na célula especificada pelo índice.
     * Gerencia o modo auto-kill e a atualização do lastPlayedSoundIndex.
     * @param {number} index - O índice da célula a ser tocada.
     * @returns {boolean} True se um som foi efetivamente reproduzido, false caso contrário.
     */
    function playSound(index) {
        const sound = soundData[index];

        // Se não há som, não faz nada além de retornar false. lastPlayedSoundIndex NÃO é atualizado AQUI.
        if (!sound || !sound.audioBuffer) {
            return false;
        }

        initAudioContext();

        // Aplicar auto-kill ao som anteriormente tocado, se houver e o modo estiver ativado.
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            const lastSound = soundData[lastPlayedSoundIndex];
            if (lastSound) {
                lastSound.activePlayingInstances.forEach(instance => {
                    const cell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
                    if (cell) cell.classList.remove('active');
                    fadeoutInstance(instance.source, instance.gain, 0.2); // Fade out rápido
                });
                lastSound.activePlayingInstances.clear();
            }
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
                playActualSound(sound, index, currentFadeInDuration);
                lastPlayedSoundIndex = index; // Atualiza o cursor APÓS tocar
            }).catch(e => console.error('Erro ao retomar AudioContext:', e));
        } else {
            playActualSound(sound, index, currentFadeInDuration);
            lastPlayedSoundIndex = index; // Atualiza o cursor APÓS tocar
        }
        return true; // Um som foi iniciado
    }

    function playActualSound(sound, index, fadeInDuration = 0) {
        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;
        source.loop = sound.isLooping;

        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.masterGainNode);
        source.connect(gainNode);

        const now = audioContext.currentTime;
        if (fadeInDuration > 0) {
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(1, now + fadeInDuration);
        } else {
            gainNode.gain.setValueAtTime(1, now);
        }

        const playingInstance = { source, gain: gainNode };
        sound.activePlayingInstances.add(playingInstance);
        globalActivePlayingInstances.add(playingInstance);

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('active');
            if (sound.isCued) {
                sound.isCued = false;
                cell.classList.remove('cued');
                cuedSounds.delete(index);
            }
            source.onended = () => {
                if (!source.loop) {
                    // Pequeno atraso para garantir que a transição visual é suave
                    setTimeout(() => {
                        cell.classList.remove('active');
                        sound.activePlayingInstances.delete(playingInstance);
                        globalActivePlayingInstances.delete(playingInstance);
                        source.disconnect();
                        gainNode.disconnect();
                        if (sound.activePlayingInstances.size === 0) {
                            cell.classList.remove('active');
                        }
                    }, 50);
                }
            };
        }

        if (playMultipleCheckbox.checked) {
            source.start(0);
        } else {
            // Parar outras instâncias ativas do MESMO som
            sound.activePlayingInstances.forEach(instance => {
                if (instance !== playingInstance) {
                    fadeoutInstance(instance.source, instance.gain, 0.1);
                }
            });
            source.start(0);
        }
    }

    function fadeoutInstance(sourceNode, gainNode, duration) {
        if (!audioContext || !sourceNode || !gainNode || typeof gainNode.gain === 'undefined') return;

        const now = audioContext.currentTime;
        if (duration === 0) {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(0, now);
            try {
                sourceNode.stop();
            } catch (e) {
                console.warn("Erro ao parar sourceNode:", e);
            }
            sourceNode.disconnect();
            gainNode.disconnect();
        } else {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

            const stopTime = now + duration;
            try {
                sourceNode.stop(stopTime);
            } catch (e) {
                console.warn("Erro ao agendar stop para sourceNode:", e);
            }

            sourceNode.onended = () => {
                sourceNode.disconnect();
                gainNode.disconnect();
            };

            setTimeout(() => {
                if (sourceNode.numberOfOutputs > 0) {
                    sourceNode.disconnect();
                    gainNode.disconnect();
                }
            }, duration * 1000 + 100);
        }
    }

    function fadeoutSound(index, duration) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext();
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);

        const instancesToFade = new Set(sound.activePlayingInstances);

        instancesToFade.forEach(instance => {
            fadeoutInstance(instance.source, instance.gain, duration);
            sound.activePlayingInstances.delete(instance);
            globalActivePlayingInstances.delete(instance);
        });

        if (cell) cell.classList.remove('active');
        console.log(`Sound ${index} fading out over ${duration} seconds.`);
    }

    function clearSoundCell(index, fadeDuration = 0.1) {
        const sound = soundData[index];
        if (!sound) {
            return;
        }

        fadeoutSound(index, fadeDuration);

        setTimeout(() => {
            clearSoundData(index);

            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '', isLooping: false, isCued: false }, true);
                cell.classList.remove('active');
                cell.classList.remove('cued');
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
        if (sound && sound.activePlayingInstances) {
            sound.activePlayingInstances.forEach(instance => {
                try {
                    instance.source.stop(0);
                    instance.source.disconnect();
                    instance.gain.disconnect();
                } catch (e) {
                    console.warn("Erro ao desconectar instância de áudio ao limpar dados:", e);
                }
                globalActivePlayingInstances.delete(instance);
            });
            sound.activePlayingInstances.clear();
        }
        if (soundData[index]) {
            soundData[index].isCued = false;
        }
        cuedSounds.delete(index);
        soundData[index] = null;
    }

    function toggleCue(index) {
        const sound = soundData[index];
        if (!sound || sound.audioBuffer === null) {
            return;
        }

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            sound.isCued = !sound.isCued;
            cell.classList.toggle('cued', sound.isCued);

            if (sound.isCued) {
                cuedSounds.add(index);
            } else {
                cuedSounds.delete(index);
            }
            saveSettings();
        }
    }

    function playCuedSounds() {
        if (cuedSounds.size === 0) {
            return;
        }

        const soundsToPlay = Array.from(cuedSounds);
        soundsToPlay.forEach(index => {
            playSound(index);
        });
    }

    function stopCuedSounds() {
        if (cuedSounds.size === 0) {
            return;
        }

        const soundsToStop = Array.from(cuedSounds);
        soundsToStop.forEach(index => {
            fadeoutSound(index, currentFadeOutDuration);
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell && soundData[index]) {
                soundData[index].isCued = false;
                cell.classList.remove('cued');
            }
        });
        cuedSounds.clear();
        saveSettings();
    }

    function removeAllCues() {
        cuedSounds.forEach(index => {
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell && soundData[index]) {
                soundData[index].isCued = false;
                cell.classList.remove('cued');
            }
        });
        cuedSounds.clear();
        saveSettings();
    }

    // NOVO: Função auxiliar para encontrar a próxima/anterior célula com som
    function findNextSoundIndex(startIndex, direction) {
        let currentIndex = startIndex;
        let attempts = 0;
        const maxAttempts = NUM_CELLS; // Evita loop infinito em caso de todas as células vazias

        while (attempts < maxAttempts) {
            currentIndex += direction;

            if (currentIndex >= NUM_CELLS) {
                currentIndex = 0; // Wrap around to start
            } else if (currentIndex < 0) {
                currentIndex = NUM_CELLS - 1; // Wrap around to end
            }

            // Se encontrarmos um som carregado, retornamos o índice
            if (soundData[currentIndex] && soundData[currentIndex].audioBuffer) {
                return currentIndex;
            }

            // Se, ao avançar, chegarmos novamente ao ponto de partida
            // (e o ponto de partida estava vazio ou não tinha som),
            // isso significa que não há mais sons na direção desejada.
            // Isso acontece se start index for null e a primeira célula não tiver som,
            // ou se só houver uma célula com som e você tentar avançar/retroceder.
            if (startIndex !== null && currentIndex === startIndex && attempts > 0) {
                return null; // Não há mais sons para encontrar
            }

            attempts++;
        }
        return null; // Não encontrou nenhum som em todas as tentativas
    }


    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            return;
        }

        // Lógica para Space e Ctrl + Space (Qlab style)
        if (pressedKey === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) { // Apenas Space (GO)
            e.preventDefault();
            let targetIndex;

            if (lastPlayedSoundIndex === null) {
                // Se nenhum som foi tocado ainda, começa a procurar a partir do -1 para encontrar o 0 ou o próximo
                targetIndex = findNextSoundIndex(-1, 1);
            } else {
                targetIndex = findNextSoundIndex(lastPlayedSoundIndex, 1);
            }

            if (targetIndex !== null) {
                const played = playSound(targetIndex);
                // lastPlayedSoundIndex é atualizado dentro de playSound SE o som for reproduzido.
                // Se playSound retornar false (célula vazia), não atualizamos lastPlayedSoundIndex aqui,
                // mas a lógica de findNextSoundIndex já garantiu que saltamos vazios.
            } else {
                console.log("Não há mais sons para tocar para a frente.");
                // O que fazer se não houver mais sons para tocar?
                // Podemos manter lastPlayedSoundIndex como está ou redefini-lo para o início/fim.
                // Por agora, vou mantê-lo, para que o próximo GO procure de novo a partir do último ponto.
                // O QLab geralmente para de avançar se não há mais deixas.
            }
            return;
        } else if (pressedKey === ' ' && e.ctrlKey) { // Ctrl + Space (GO-)
            e.preventDefault();
            let targetIndex;

            if (lastPlayedSoundIndex === null) {
                // Se nenhum som foi tocado ainda, começa a procurar a partir do NUM_CELLS para encontrar o último ou o anterior
                targetIndex = findNextSoundIndex(NUM_CELLS, -1);
            } else {
                targetIndex = findNextSoundIndex(lastPlayedSoundIndex, -1);
            }

            if (targetIndex !== null) {
                const played = playSound(targetIndex);
                // lastPlayedSoundIndex é atualizado dentro de playSound SE o som for reproduzido.
            } else {
                console.log("Não há mais sons para tocar para trás.");
            }
            return;
        }

        // Atalhos de teclado para Cue/Go
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.ctrlKey) { // Ctrl + Enter: Adiciona/remove o último som tocado do cue
                if (lastPlayedSoundIndex !== null && soundData[lastPlayedSoundIndex]) {
                    toggleCue(lastPlayedSoundIndex);
                }
            } else if (e.shiftKey) { // Shift + Enter: Para todos os sons em cue
                stopCuedSounds();
            } else if (e.altKey) { // Alt + Enter: Remove todos os cues sem parar
                removeAllCues();
            }
            else { // Enter (sem modificadores): Toca todos os sons em cue
                playCuedSounds();
            }
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
        } else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault();
            fadeInRange.value = parseInt(pressedKey);
            currentFadeInDuration = parseFloat(fadeInRange.value);
            updateFadeInDisplay();
            saveSettings();
        } else if (pressedKey >= '0' && pressedKey <= '9' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            fadeOutRange.value = parseInt(pressedKey);
            currentFadeOutDuration = parseFloat(fadeOutRange.value);
            updateFadeOutDisplay();
            saveSettings();
        } else {
            const indexToPlay = defaultKeys.indexOf(pressedKey);
            if (indexToPlay !== -1 && soundData[indexToPlay] && soundData[indexToPlay].audioBuffer) {
                playSound(indexToPlay);
            }
        }
    });

    fadeInRange.addEventListener('input', () => {
        currentFadeInDuration = parseFloat(fadeInRange.value);
        updateFadeInDisplay();
        saveSettings();
    });

    fadeOutRange.addEventListener('input', () => {
        currentFadeOutDuration = parseFloat(fadeOutRange.value);
        updateFadeOutDisplay();
        saveSettings();
    });

    volumeRange.addEventListener('input', () => {
        updateVolumeDisplay();
        if (audioContext && audioContext.masterGainNode) {
            audioContext.masterGainNode.gain.value = volumeRange.value;
        }
        saveSettings();
    });

    function updateVolumeDisplay() {
        volumeDisplay.textContent = `${Math.round(volumeRange.value * 100)}%`;
    }

    function updateFadeInDisplay() {
        if (!translations[currentLanguage]) {
            fadeInDisplay.textContent = `Loading...`;
            return;
        }
        if (currentFadeInDuration === 0) {
            fadeInDisplay.textContent = `${currentFadeInDuration}s${translations[currentLanguage].immediateStart || ' (Início Imediato)'}`;
        } else {
            fadeInDisplay.textContent = `${currentFadeInDuration}s`;
        }
    }

    function updateFadeOutDisplay() {
        if (!translations[currentLanguage]) {
            fadeOutDisplay.textContent = `Loading...`;
            return;
        }
        if (currentFadeOutDuration === 0) {
            fadeOutDisplay.textContent = `${currentFadeOutDuration}s${translations[currentLanguage].immediateStop || ' (Paragem Imediata)'}`;
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

            const instancesToStop = new Set(globalActivePlayingInstances);

            instancesToStop.forEach(instance => {
                if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
                    try {
                        instance.gain.gain.cancelScheduledValues(now);
                        instance.gain.gain.setValueAtTime(instance.gain.gain.value, now);
                        instance.gain.gain.linearRampToValueAtTime(0.001, now + fadeDuration);

                        setTimeout(() => {
                            if (instance.source) {
                                instance.source.stop();
                                instance.source.disconnect();
                            }
                            if (instance.gain) {
                                instance.gain.disconnect();
                            }
                        }, fadeDuration * 1000 + 50);
                    } catch (error) {
                        console.warn("Erro ao parar som ou aplicar fade-out:", error);
                        if (instance.source && typeof instance.source.stop === 'function') {
                            instance.source.stop();
                        }
                    }
                }
                globalActivePlayingInstances.delete(instance);
            });

            globalActivePlayingInstances.clear();

            document.querySelectorAll('.sound-cell.active').forEach(cell => {
                cell.classList.remove('active');
            });

            soundData.forEach(sound => {
                if (sound && sound.activePlayingInstances) {
                    sound.activePlayingInstances.clear();
                }
            });
            lastPlayedSoundIndex = null;
        }
    }

    stopAllSoundsBtn.addEventListener('click', stopAllSounds);

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
                    alert(translations[currentLanguage].alertNoEmptyCells.replace('{fileName}', file.name));
                    break;
                }
            }
        };
        input.click();
    });

    langButtons.forEach(button => {
        button.addEventListener('click', () => {
            setLanguage(button.dataset.lang);
        });
    });

    loadTranslations().then(() => {
        loadSettings();
        setLanguage(currentLanguage);
    });

    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
