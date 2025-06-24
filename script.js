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
    const langButtons = document.querySelectorAll('.lang-button');

    let audioContext;
    const soundData = []; // { name, key, audioBuffer, audioDataUrl, activeGainNodes: Set, color }
    const globalActiveGainNodes = new Set();
    let lastPlayedSoundIndex = null;
    let currentFadeOutDuration = 0; // Default para paragem imediata (0 segundos)
    let currentLanguage = 'pt'; // Default language

    // Objeto de traduções
    const translations = {
        pt: {
            title: "Soundboard QWERTY",
            mainTitle: "Soundboard QWERTY",
            volumeLabel: "Volume:",
            playMultipleLabel: "Reproduzir Múltiplos",
            autokillLabel: "Auto-Kill Anterior",
            loadMultipleSoundsButton: "Carregar Múltiplos Sons",
            stopAllSoundsButton: "Parar Todos os Sons (ESC)",
            fadeOutLabel: "Fade Out: ",
            immediateStop: " (Paragem Imediata)",
            howToUseTitle: "Como Usar:",
            dragDropHelp: "<strong>Arrastar e Largar:</strong> Arraste ficheiros de áudio (MP3, WAV, OGG) para as células para as preencher.",
            clickHelp: "<strong>Clicar:</strong> Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.",
            shortcutsHelp: "<strong>Atalhos de Teclado:</strong> Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: Q para a primeira célula).",
            stopAllHelp: "<strong>Parar Sons:</strong> Pressione <kbd>ESC</kbd> para parar todos os sons a tocar.",
            volumeHelp: "<strong>Ajustar Volume:</strong> Use o slider de volume ou as teclas <kbd>⬆️</kbd> e <kbd>⬇️</kbd> para controlar o volume global.",
            deleteSoundHelp: "<strong>Apagar Som:</strong> Clique no <span style=\"font-size:1.1em;\">❌</span> no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga; um clique longo (>0.5s) faz fade out.*",
            replaceSoundHelp: "<strong>Substituir Som:</strong> Clique no <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> para carregar um novo som para a célula.",
            renameHelp: "<strong>Mudar Nome:</strong> Clique no nome do som para editá-lo.",
            fadeOutControlHelp: "<strong>Controlar Fade Out:</strong> Pressione as teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade out em segundos. (<kbd>0</kbd> = Paragem Imediata).",
            playMultipleModeHelp: "<strong>Modo Reproduzir Múltiplos:</strong> Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.",
            autokillModeHelp: "<strong>Modo Auto-Kill Anterior:</strong> Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.",
            alertInvalidFile: "Por favor, arraste um ficheiro de áudio válido (MP3, WAV, OGG).",
            alertLoadError: "Não foi possível carregar o áudio \"{fileName}\". Verifique o formato do ficheiro e se não está corrompido.",
            alertDecodeError: "Erro ao carregar o som \"{soundName}\". Pode estar corrompido.",
            alertNoEmptyCells: "Não há mais células vazias para carregar \"{fileName}\".",
            cellEmptyText: "Clique para carregar som",
            cellNoName: "Sem Nome",
            cellEmptyDefault: "Vazio",
        },
        en: {
            title: "QWERTY Soundboard",
            mainTitle: "QWERTY Soundboard",
            volumeLabel: "Volume:",
            playMultipleLabel: "Play Multiple",
            autokillLabel: "Auto-Kill Previous",
            loadMultipleSoundsButton: "Load Multiple Sounds",
            stopAllSoundsButton: "Stop All Sounds (ESC)",
            fadeOutLabel: "Fade Out: ",
            immediateStop: " (Immediate Stop)",
            howToUseTitle: "How to Use:",
            dragDropHelp: "<strong>Drag and Drop:</strong> Drag audio files (MP3, WAV, OGG) to cells to fill them.",
            clickHelp: "<strong>Click:</strong> Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.",
            shortcutsHelp: "<strong>Keyboard Shortcuts:</strong> Press the corresponding key on your keyboard to play the sound. (Ex: Q for the first cell).",
            stopAllHelp: "<strong>Stop Sounds:</strong> Press <kbd>ESC</kbd> to stop all playing sounds.",
            volumeHelp: "<strong>Adjust Volume:</strong> Use the volume slider or <kbd>⬆️</kbd> and <kbd>⬇️</kbd> keys to control global volume.",
            deleteSoundHelp: "<strong>Delete Sound:</strong> Click the <span style=\"font-size:1.1em;\">❌</span> in the top right corner of a cell to clear it. *A quick click deletes; a long click (>0.5s) fades out.*",
            replaceSoundHelp: "<strong>Replace Sound:</strong> Click the <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> to load a new sound for the cell.",
            renameHelp: "<strong>Change Name:</strong> Click the sound name to edit it.",
            fadeOutControlHelp: "<strong>Control Fade Out:</strong> Press numeric keys <kbd>0</kbd>-<kbd>9</kbd> to set fade out duration in seconds. (<kbd>0</kbd> = Immediate Stop).",
            playMultipleModeHelp: "<strong>Play Multiple Mode:</strong> Allows multiple sounds to play at the same time if the box is checked.",
            autokillModeHelp: "<strong>Auto-Kill Previous Mode:</strong> When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.",
            alertInvalidFile: "Please drag a valid audio file (MP3, WAV, OGG).",
            alertLoadError: "Could not load audio \"{fileName}\". Check the file format and if it is corrupted.",
            alertDecodeError: "Error loading sound \"{soundName}\". It may be corrupted.",
            alertNoEmptyCells: "No more empty cells to load \"{fileName}\".",
            cellEmptyText: "Click to load sound",
            cellNoName: "No Name",
            cellEmptyDefault: "Empty",
        },
        it: {
            title: "Soundboard QWERTY",
            mainTitle: "Soundboard QWERTY",
            volumeLabel: "Volume:",
            playMultipleLabel: "Riproduci Multipli",
            autokillLabel: "Auto-Kill Precedente",
            loadMultipleSoundsButton: "Carica Più Suoni",
            stopAllSoundsButton: "Ferma Tutti i Suoni (ESC)",
            fadeOutLabel: "Fade Out: ",
            immediateStop: " (Arresto Immediato)",
            howToUseTitle: "Come Usare:",
            dragDropHelp: "<strong>Trascina e Rilascia:</strong> Trascina file audio (MP3, WAV, OGG) nelle celle per riempirle.",
            clickHelp: "<strong>Clicca:</strong> Clicca su una cella vuota per aprire una finestra di selezione file. Clicca su una cella piena per riprodurre il suono.",
            shortcutsHelp: "<strong>Scorciatoie da Tastiera:</strong> Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: Q per la prima cella).",
            stopAllHelp: "<strong>Ferma Suoni:</strong> Premi <kbd>ESC</kbd> per fermare tutti i suoni in riproduzione.",
            volumeHelp: "<strong>Regola Volume:</strong> Usa lo slider del volume o i tasti <kbd>⬆️</kbd> e <kbd>⬇️</kbd> per controllare il volume globale.",
            deleteSoundHelp: "<strong>Elimina Suono:</strong> Clicca su <span style=\"font-size:1.1em;\">❌</span> nell'angolo in alto a destra di una cella per svuotarla. *Un clic rapido elimina; un clic lungo (>0.5s) sfuma.*",
            replaceSoundHelp: "<strong>Sostituisci Suono:</strong> Clicca su <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> per caricare un nuovo suono per la cella.",
            renameHelp: "<strong>Modifica Nome:</strong> Clicca sul nome del suono per modificarlo.",
            fadeOutControlHelp: "<strong>Controlla Fade Out:</strong> Premi i tasti numerici <kbd>0</kbd>-<kbd>9</kbd> per impostare la durata dello sfumato in secondi. (<kbd>0</kbd> = Arresto Immediato).",
            playMultipleModeHelp: "<strong>Modalità Riproduci Multipli:</strong> Consente a più suoni di essere riprodotti contemporaneamente se la casella è selezionata.",
            autokillModeHelp: "<strong>Modalità Auto-Kill Precedente:</strong> Quando si riproduce un nuovo suono, il suono precedentemente attivo (se presente) verrà interrotto con uno sfumato rapido.",
            alertInvalidFile: "Per favore, trascina un file audio valido (MP3, WAV, OGG).",
            alertLoadError: "Impossibile caricare l'audio \"{fileName}\". Verifica il formato del file e se non è corrotto.",
            alertDecodeError: "Errore durante il caricamento del suono \"{soundName}\". Potrebbe essere corrotto.",
            alertNoEmptyCells: "Non ci sono più celle vuote per caricare \"{fileName}\".",
            cellEmptyText: "Clicca per caricare il suono",
            cellNoName: "Senza Nome",
            cellEmptyDefault: "Vuoto",
        }
    };

    // Teclas organizadas pela lógica QWERTY (top row, home row, bottom row)
    const defaultKeys = [
        'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', // Top row (10 keys)
        'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',     // Home row (9 keys)
        'z', 'x', 'c', 'v', 'b', 'n', 'm'                // Bottom row (7 keys)
    ];
    const NUM_CELLS = defaultKeys.length; // Número de células é agora o número de teclas QWERTY

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

    // Função para definir o idioma
    function setLanguage(lang) {
        currentLanguage = lang;
        localStorage.setItem('soundboardLanguage', lang); // Save language
        
        // Update all static texts
        document.querySelector('title').textContent = translations[lang].title;
        document.getElementById('mainTitle').textContent = translations[lang].mainTitle;
        document.getElementById('volumeLabel').textContent = translations[lang].volumeLabel;
        document.getElementById('playMultipleLabel').textContent = translations[lang].playMultipleLabel;
        document.getElementById('autokillLabel').textContent = translations[lang].autokillLabel;
        document.getElementById('loadMultipleSoundsButton').textContent = translations[lang].loadMultipleSoundsButton;
        document.getElementById('stopAllSoundsButton').textContent = translations[lang].stopAllSoundsButton;
        document.getElementById('fadeOutLabel').textContent = translations[lang].fadeOutLabel;
        document.getElementById('howToUseTitle').textContent = translations[lang].howToUseTitle;

        // Update help texts
        document.querySelector('[data-key="dragDropHelp"]').innerHTML = translations[lang].dragDropHelp;
        document.querySelector('[data-key="clickHelp"]').innerHTML = translations[lang].clickHelp;
        document.querySelector('[data-key="shortcutsHelp"]').innerHTML = translations[lang].shortcutsHelp;
        document.querySelector('[data-key="stopAllHelp"]').innerHTML = translations[lang].stopAllHelp;
        document.querySelector('[data-key="volumeHelp"]').innerHTML = translations[lang].volumeHelp;
        document.querySelector('[data-key="deleteSoundHelp"]').innerHTML = translations[lang].deleteSoundHelp;
        document.querySelector('[data-key="replaceSoundHelp"]').innerHTML = translations[lang].replaceSoundHelp;
        document.querySelector('[data-key="renameHelp"]').innerHTML = translations[lang].renameHelp;
        document.querySelector('[data-key="fadeOutControlHelp"]').innerHTML = translations[lang].fadeOutControlHelp;
        document.querySelector('[data-key="playMultipleModeHelp"]').innerHTML = translations[lang].playMultipleModeHelp;
        document.querySelector('[data-key="autokillModeHelp"]').innerHTML = translations[lang].autokillModeHelp;

        // Update empty cell text
        document.querySelectorAll('.sound-cell.empty').forEach(cell => {
            cell.dataset.emptyText = translations[lang].cellEmptyText;
        });

        // Update current fade out display
        updateFadeOutDisplay();

        // Update active language button style
        langButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.lang === lang) {
                button.classList.add('active');
            }
        });
    }

    // Carregar configurações do localStorage
    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        
        currentLanguage = localStorage.getItem('soundboardLanguage') || 'pt'; // Load language
        setLanguage(currentLanguage); // Apply language immediately

        volumeRange.value = savedSettings.volume !== undefined ? savedSettings.volume : 0.75;
        playMultipleCheckbox.checked = savedSettings.playMultiple !== undefined ? savedSettings.playMultiple : false;
        autokillModeCheckbox.checked = savedSettings.autokillMode !== undefined ? savedSettings.autokillMode : false;
        currentFadeOutDuration = savedSettings.currentFadeOutDuration !== undefined ? savedSettings.currentFadeOutDuration : 0;
        
        updateVolumeDisplay();
        updateFadeOutDisplay();

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
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null, 
                audioDataUrl: data ? data.audioDataUrl : null,
                color: data ? data.color : null
            }))
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
        // Language is saved separately by setLanguage function
    }

    // Cria e adiciona uma célula da soundboard à linha QWERTY correta
    function createSoundCell(index) {
        const cell = document.createElement('div');
        cell.classList.add('sound-cell', 'empty');
        cell.dataset.index = index;
        cell.dataset.emptyText = translations[currentLanguage].cellEmptyText; // Set initial empty text

        // Botão de Substituir Som
        const replaceButton = document.createElement('button');
        replaceButton.classList.add('replace-sound-button');
        replaceButton.innerHTML = '<span class="material-symbols-outlined">upload_file</span>';
        replaceButton.title = translations[currentLanguage].replaceSoundHelp.replace(/<[^>]*>/g, '').replace('Click the  to load a new sound for the cell.', '').trim(); // Tooltip based on translation
        cell.appendChild(replaceButton);

        // Botão de Apagar
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '❌'; 
        deleteButton.title = translations[currentLanguage].deleteSoundHelp.replace(/<[^>]*>/g, '').replace('Click to clear; long click for fade out.', '').trim(); // Tooltip
        cell.appendChild(deleteButton);

        const nameDisplay = document.createElement('div');
        nameDisplay.classList.add('sound-name');
        nameDisplay.contentEditable = true;
        nameDisplay.spellcheck = false;
        nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault; // Set initial empty default name
        nameDisplay.title = translations[currentLanguage].renameHelp.replace(/<[^>]*>/g, '').replace('Click to edit the name.', '').trim(); // Tooltip
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
                alert(translations[currentLanguage].alertInvalidFile);
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
                alert(translations[currentLanguage].alertLoadError.replace('{fileName}', file.name));
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
                name: name || translations[currentLanguage].cellNoName,
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
            alert(translations[currentLanguage].alertDecodeError.replace('{soundName}', name));
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
            nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
            nameDisplay.contentEditable = false;
            deleteButton.style.display = 'none'; 
            replaceButton.style.display = 'none'; 
            cell.style.backgroundColor = 'transparent'; 
            cell.dataset.emptyText = translations[currentLanguage].cellEmptyText; // Update data attribute for ::before
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || translations[currentLanguage].cellNoName;
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
                playActualSound(sound, index);
                lastPlayedSoundIndex = index;
            }).catch(e => console.error('Erro ao retomar AudioContext:', e));
        } else {
            playActualSound(sound, index);
            lastPlayedSoundIndex = index;
        }
    }

    function playActualSound(sound, index) {
        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;

        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.masterGainNode);
        source.connect(gainNode);

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
        } else if (pressedKey >= '0' && pressedKey <= '9') {
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

    // Atualiza o display de fade out
    function updateFadeOutDisplay() {
        if (currentFadeOutDuration === 0) {
            fadeOutDisplay.textContent = `0s${translations[currentLanguage].immediateStop}`;
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

    // Event listeners for language buttons
    langButtons.forEach(button => {
        button.addEventListener('click', () => {
            setLanguage(button.dataset.lang);
            // Re-render relevant parts to apply language if needed (e.g., cell empty text)
            document.querySelectorAll('.sound-cell.empty').forEach((cell, i) => {
                 // Ensure the empty text is updated
                cell.dataset.emptyText = translations[currentLanguage].cellEmptyText;
                // Also update the nameDisplay if it's currently showing "Vazio"
                const nameDisplay = cell.querySelector('.sound-name');
                if (nameDisplay.textContent === 'Vazio' || nameDisplay.textContent === 'Empty' || nameDisplay.textContent === 'Vuoto') {
                     nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
                }
            });
            // Update tooltips
            document.querySelectorAll('.delete-button').forEach(btn => {
                btn.title = translations[currentLanguage].deleteSoundHelp.replace(/<[^>]*>/g, '').replace('Click to clear; long click for fade out.', '').trim();
            });
            document.querySelectorAll('.replace-sound-button').forEach(btn => {
                btn.title = translations[currentLanguage].replaceSoundHelp.replace(/<[^>]*>/g, '').replace('Click the  to load a new sound for the cell.', '').trim();
            });
             document.querySelectorAll('.sound-name').forEach((nameDisplay, i) => {
                if (soundData[i] && soundData[i].audioBuffer) {
                    nameDisplay.title = translations[currentLanguage].renameHelp.replace(/<[^>]*>/g, '').replace('Click to edit the name.', '').trim();
                } else {
                    nameDisplay.title = translations[currentLanguage].renameHelp.replace(/<[^>]*>/g, '').replace('Click to edit the name.', '').trim();
                }
            });
        });
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
                    alert(translations[currentLanguage].alertNoEmptyCells.replace('{fileName}', file.name));
                    break;
                }
            }
        };
        input.click();
    });

    // Inicialização: carrega as configurações, que por sua vez criam as células
    loadSettings(); 

    // Workaround para o Chrome: AudioContext precisa de uma interação do utilizador
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
