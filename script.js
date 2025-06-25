<script>
        document.addEventListener('DOMContentLoaded', () => {
            // --- Variáveis Globais ---
            const soundboardGrid = document.getElementById('soundboard-grid');
            const rowTop = document.getElementById('row-top');
            const rowHome = document.getElementById('row-home');
            const rowBottom = document.getElementById('row-bottom');

            const volumeRange = document.getElementById('volume-range');
            const volumeDisplay = document.getElementById('volume-display');
            const playMultipleCheckbox = document.getElementById('play-multiple');
            const autokillModeCheckbox = document.getElementById('autokill-mode');
            const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
            // const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general'); // Removido do HTML
            const fadeOutRange = document.getElementById('fadeOut-range');
            const fadeOutDisplay = document.getElementById('fadeout-display');
            const fadeInRange = document.getElementById('fadeIn-range');
            const fadeInDisplay = document.getElementById('fadeIn-display');
            const langButtons = document.querySelectorAll('.lang-button');

            // Elementos para a secção de ajuda
            const helpToggle = document.getElementById('help-toggle');
            const helpList = document.getElementById('help-list');


            let audioContext = null; // Inicialmente nulo, será criado na primeira interação do utilizador
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
                    // Fallback para traduções embutidas caso o ficheiro não carregue ou haja erro de rede
                    translations = {
                        pt: {
                            title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Reproduzir Múltiplos", autokillLabel: "Auto-Kill Anterior", stopAllSoundsButton: "Parar Todos os Sons (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Início Imediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Paragem Imediata)", howToUseTitle: "Como Usar:", clickHelp: "<strong>Clicar:</strong> Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.", shortcutsHelp: "<strong>Atalhos de Teclado:</strong> Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: Q para a primeira célula).", navigationHelp: "<strong>Navegação (Modo QLab):</strong> Pressione <kbd>Espaço</kbd> para tocar o próximo som disponível. Pressione <kbd>Ctrl</kbd> + <kbd>Espaço</kbd> para tocar o som disponível anterior. Células vazias são ignoradas.", stopAllHelp: "<strong>Parar Sons:</strong> Pressione <kbd>ESC</kbd> para parar todos os sons a tocar.", volumeHelp: "<strong>Ajustar Volume:</strong> Use o slider de volume ou as teclas <kbd>⬆️</kbd> e <kbd>⬇️</kbd> para controlar o volume global.", deleteSoundHelp: "<strong>Apagar Som:</strong> Clique no <span style=\"font-size:1.1em;\">❌</span> no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga; um clique longo (>0.5s) faz fade out.*", replaceSoundHelp: "<strong>Substituir Som:</strong> Clique no <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> para carregar um novo som para a célula.", renameHelp: "<strong>Mudar Nome:</strong> Clique no nome do som para editá-lo.", fadeInHelp: "<strong>Controlar Fade In:</strong> Use o slider de Fade In, ou as teclas <kbd>Ctrl</kbd> + teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade in em segundos.", fadeOutControlHelp: "<strong>Controlar Fade Out:</strong> Use o slider de Fade Out, ou as teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade out em segundos.", playMultipleModeHelp: "<strong>Modo Reproduzir Múltiplos:</strong> Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.", autokillModeHelp: "<strong>Modo Auto-Kill Anterior:</strong> Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.", alertInvalidFile: "Tipo de ficheiro inválido. Por favor, arraste ficheiros de áudio (MP3, WAV, OGG).", alertLoadError: "Não foi possível carregar o áudio '{fileName}'.", alertDecodeError: "Erro ao descodificar o áudio '{soundName}'.", alertNoEmptyCells: "Não há mais células vazias para carregar o ficheiro '{fileName}'.", cellEmptyText: "Clique para carregar o som", cellNoName: "Sem Nome", cellEmptyDefault: "Vazio", loopButtonTitle: "Ativar/Desativar Loop", cueHelp: "<strong>CUE / GO:</strong> Pressione <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para 'cue' (marcar) um som. Pressione <kbd>Enter</kbd> para tocar todos os sons em 'cue' com fade-in. Pressione <kbd>Shift</kbd> + <kbd>Enter</kbd> para parar todos os sons em 'cue' com fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Pressione <kbd>Ctrl</kbd> + clique na célula para adicionar/remover um som do 'cue'.", removeCueHelp: "<strong>Remover CUE:</strong> Pressione <kbd>Alt</kbd> + <kbd>Enter</kbd> para remover todos os sons do 'cue' sem os parar.",
                        },
                        en: {
                            title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Play Multiple", autokillLabel: "Auto-Kill Previous", stopAllSoundsButton: "Stop All Sounds (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Immediate Start)", fadeOutLabel: "Fade Out:", immediateStop: " (Immediate Stop)", howToUseTitle: "How To Use:", clickHelp: "<strong>Click:</strong> Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.", shortcutsHelp: "<strong>Keyboard Shortcuts:</strong> Press the corresponding key on your keyboard to play the sound. (e.g., Q for the first cell).", navigationHelp: "<strong>Navigation (QLab Mode):</strong> Press <kbd>Space</kbd> to play the next available sound. Press <kbd>Ctrl</kbd> + <kbd>Space</kbd> to play the previous available sound. Empty cells are skipped.", stopAllHelp: "<strong>Stop Sounds:</strong> Press <kbd>ESC</kbd> to stop all playing sounds.", volumeHelp: "<strong>Adjust Volume:</strong> Use the volume slider or the <kbd>⬆️</kbd> and <kbd>⬇️</kbd> keys to control global volume.", deleteSoundHelp: "<strong>Delete Sound:</strong> Click the <span style=\"font-size:1.1em;\">❌</span> in the top right corner of a cell to clear it. *A quick click deletes; a long click (>0.5s) fades out.*", replaceSoundHelp: "<strong>Replace Sound:</strong> Click the <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> to upload a new sound to the cell.", renameHelp: "<strong>Rename Sound:</strong> Click the sound's name to edit it.", fadeInHelp: "<strong>Control Fade In:</strong> Use the Fade In slider, or press <kbd>Ctrl</kbd> + number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-in duration in seconds.", fadeOutControlHelp: "<strong>Control Fade Out:</strong> Use the Fade Out slider, or press number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-out duration in seconds.", playMultipleModeHelp: "<strong>Play Multiple Mode:</strong> Allows multiple sounds to play simultaneously if checked.", autokillModeHelp: "<strong>Auto-Kill Previous Mode:</strong> When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.", alertInvalidFile: "Invalid file type. Please drag audio files (MP3, WAV, OGG).", alertLoadError: "Could not load audio '{fileName}'.", alertDecodeError: "Error decoding audio '{soundName}'.", alertNoEmptyCells: "No more empty cells to load file '{fileName}'.", cellEmptyText: "Click to load sound", cellNoName: "No Name", cellEmptyDefault: "Empty", loopButtonTitle: "Loop (Toggle)", cueHelp: "<strong>CUE / GO:</strong> Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to 'cue' (mark) a sound. Press <kbd>Enter</kbd> to play all 'cued' sounds with fade-in. Press <kbd>Shift</kbd> + <kbd>Enter</kbd> to stop all 'cued' sounds with fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Press <kbd>Ctrl</kbd> + click on the cell to add/remove a sound from 'cue'.", removeCueHelp: "<strong>Remove CUE:</strong> Press <kbd>Alt</kbd> + <kbd>Enter</kbd> to remove all cued sounds without stopping them.",
                        },
                        it: {
                            title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Riproduci Multipli", autokillLabel: "Auto-Stop Precedente", stopAllSoundsButton: "Ferma Tutti i Suoni (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Avvio Immediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Arresto Immediato)", howToUseTitle: "Come Usare:", clickHelp: "<strong>Clicca:</strong> Clicca una cella vuota per aprire una finestra di selezione file. Clicca una cella piena per riprodurre il suono.", shortcutsHelp: "<strong>Scorciatoie da Tastiera:</strong> Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: Q per la prima cella).", navigationHelp: "<strong>Navigazione (Modalità QLab):</strong> Premi <kbd>Spazio</kbd> per riprodurre il prossimo suono disponibile. Premi <kbd>Ctrl</kbd> + <kbd>Spazio</kbd> per riprodurre il suono disponibile precedente. Le celle vuote vengono saltate.", stopAllHelp: "<strong>Ferma Suoni:</strong> Premi <kbd>ESC</kbd> per fermare tutti i suoni in riproduzione.", volumeHelp: "<strong>Regola Volume:</strong> Usa il cursore del volume o i tasti <kbd>⬆️</kbd> e <kbd>⬇️</kbd> per controllare il volume globale.", deleteSoundHelp: "<strong>Elimina Suono:</strong> Clicca sulla <span style=\"font-size:1.1em;\">❌</span> nell'angolo in alto a destra di una cella per svuotarla. *Un clic rapido elimina; un clic lungo (>0.5s) esegue il fade out.*", replaceSoundHelp: "<strong>Sostituisci Suono:</strong> Clicca su <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> para carregar um novo suono na cella.", renameHelp: "<strong>Rinomina Suono:</strong> Clicca sul nome del suono per modificarlo.", fadeInHelp: "<strong>Controlla Fade In:</strong> Usa lo slider Fade In, o premi <kbd>Ctrl</kbd> + tasti numerici <kbd>0</kbd>-<kbd>9</kbd> per impostare a durata do fade-in em segundos.", fadeOutControlHelp: "<strong>Controlla Fade Out:</strong> Usa lo slider Fade Out, o premi i tasti numerici <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade-out em segundos.", playMultipleModeHelp: "<strong>Modalità Riproduci Multipli:</strong> Permette a più suoni di essere riprodotti contemporaneamente se la casella è selezionata.", autokillModeHelp: "<strong>Modalità Auto-Stop Precedente:</strong> Quando viene riprodotto un nuovo suono, o som anteriormente ativo (se presente) verrà fermato com um rapido fade out.", alertInvalidFile: "Tipo de file non valido. Si prega de trascinare file audio (MP3, WAV, OGG).", alertLoadError: "Impossibile caricare l'audio '{fileName}'.", alertDecodeError: "Errore durante la decodifica dell'audio '{soundName}'.", alertNoEmptyCells: "Non ci sono più celle vuote per caricare il file '{fileName}'.", cellEmptyText: "Clicca per caricare il suono", cellNoName: "Senza Nome", cellEmptyDefault: "Vuoto", loopButtonTitle: "Loop (Attiva/Disattiva)", cueHelp: "<strong>CUE / GO:</strong> Premi <kbd>Ctrl</kbd> + <kbd>Invio</kbd> per 'cue' (segnare) un suono. Premi <kbd>Invio</kbd> per riprodurre tutti i suoni in 'cue' con fade-in. Premi <kbd>Shift</kbd> + <kbd>Invio</kbd> per fermare tutti i suoni in 'cue' con fade-out.", cueSingleHelp: "<strong>CUE Individuale:</strong> Premi <kbd>Ctrl</kbd> + clic sulla cella per aggiungere/rimuovere un suono dal 'cue'.", removeCueHelp: "<strong>Rimuovi CUE:</strong> Premi <kbd>Alt</kbd> + <kbd>Invio</kbd> per rimuovere tutti i suoni in cue senza fermarli.",
                        }
                    };
                    setLanguage('pt'); // Tenta definir PT como padrão, se não houver um guardado
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
                        if (element.tagName === 'INPUT' && (element.type === 'range' || element.type === 'checkbox' || element.type === 'radio')) {
                            // Não faz nada para estes inputs, as suas labels é que são traduzidas
                        } else {
                            element.innerHTML = translations[lang][key];
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
                        nameDisplay.textContent = (data && data.name) ? data.name : translations[currentLanguage].cellEmptyDefault;
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

                    if (loopButton) {
                        if (data && data.isLooping) {
                            loopButton.classList.add('active');
                        } else {
                            loopButton.classList.remove('active');
                        }
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

            // --- Funções de Utilitário ---
            function getRandomHSLColor() {
                const hue = Math.floor(Math.random() * 360);
                const saturation = Math.floor(Math.random() * 20) + 70; // 70-90%
                const lightness = Math.floor(Math.random() * 20) + 40; // 40-60%
                return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            }

            function dataURLToArrayBuffer(dataURL) {
                const base64 = dataURL.split(',')[1];
                const binaryString = window.atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes.buffer;
            }

            // --- Gestão do AudioContext (Crucial para evitar erros de autoplay) ---
            function initAudioContext() {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    audioContext.masterGainNode = audioContext.createGain();
                    audioContext.masterGainNode.connect(audioContext.destination);
                    audioContext.masterGainNode.gain.value = volumeRange.value;
                    console.log('AudioContext inicializado.');
                }
            }

            // --- Persistência de Dados ---
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
                        const isCued = cellData.isCued !== undefined ? cellData.isCued : false;
                        loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, fixedKey, color, isLooping, isCued);
                    } else {
                        soundData[i] = null;
                        updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey, isLooping: false, isCued: false }, true);
                    }
                }
                if (savedSettings.cuedSounds && Array.isArray(savedSettings.cuedSounds)) {
                    savedSettings.cuedSounds.forEach(idx => {
                        if (soundData[idx]) {
                            soundData[idx].isCued = true;
                            cuedSounds.add(idx);
                            const cell = document.querySelector(`.sound-cell[data-index="${idx}"]`);
                            if (cell) cell.classList.add('cued');
                        }
                    });
                }
            }

            function saveSettings() {
                const settingsToSave = {
                    volume: parseFloat(volumeRange.value),
                    playMultiple: playMultipleCheckbox.checked,
                    autokillMode: autokillModeCheckbox.checked,
                    currentFadeOutDuration: parseFloat(fadeOutRange.value),
                    currentFadeInDuration: parseFloat(fadeInRange.value),
                    cuedSounds: Array.from(cuedSounds),
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

            // --- Criação e Manipulação de Células ---
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
                // Drag & Drop (manter por enquanto, embora a instrução tenha sido removida)
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
                    if (file && (file.type.startsWith('audio/'))) {
                        // Se o drag & drop for para um único ficheiro, usa a mesma lógica de handleMultipleFilesLoad
                        // para que o comportamento seja consistente (pode arrastar múltiplos para uma célula, mas aqui pega só o primeiro)
                        handleMultipleFilesLoad([file], index);
                    } else {
                        alert(translations[currentLanguage].alertInvalidFile);
                    }
                });

                // Clique na célula (para tocar ou carregar)
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

                    // Se célula vazia, ou se clicou para carregar/substituir, abre seletor de ficheiro
                    if (cell.classList.contains('empty') || e.target.closest('.replace-sound-button')) {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'audio/mp3, audio/wav, audio/ogg';
                        input.multiple = true; // <--- AGORA PERMITE SELEÇÃO MÚLTIPLA!

                        input.onchange = async (event) => {
                            const files = Array.from(event.target.files);
                            if (files.length > 0) {
                                handleMultipleFilesLoad(files, index); // Passa os ficheiros e o índice da célula clicada
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

                // O replaceButton agora é tratado pela lógica de clique na célula que permite múltiplos.
                // Mas se tiver um handler separado para ele, precisa de ter `input.multiple = true;` nele também.
                const replaceButton = cell.querySelector('.replace-sound-button');
                replaceButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/mp3, audio/wav, audio/ogg';
                    input.multiple = true; // <--- IMPORTANTE: Adicionar aqui também!
                    input.onchange = async (event) => {
                        const files = Array.from(event.target.files);
                        if (files.length > 0) {
                            handleMultipleFilesLoad(files, index);
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

            // --- Funções de Carregamento de Áudio ---
            async function loadFileIntoCell(file, cell, index, nameOverride = null) {
                const readerArrayBuffer = new FileReader();
                const readerDataURL = new FileReader();

                const arrayBufferPromise = new Promise(resolve => {
                    readerArrayBuffer.onload = (e) => resolve(e.target.result);
                    readerArrayBuffer.readAsArrayBuffer(file);
                });

                const dataURLPromise = new Promise(resolve => {
                    readerDataURL.onload = (e) => resolve(e.target.result);
                    readerDataURL.readAsDataURL(file);
                });

                try {
                    const arrayBuffer = await arrayBufferPromise;
                    const dataUrl = await dataURLPromise;

                    const audioBuffer = await (audioContext || new AudioContext()).decodeAudioData(arrayBuffer);

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
                        audioDataUrl: dataUrl,
                        activePlayingInstances: new Set(),
                        color: cellColor,
                        isLooping: false,
                        isCued: false
                    };
                    updateCellDisplay(cell, soundData[index], false);
                    saveSettings();

                } catch (error) {
                    console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                    const fixedKey = defaultKeys[index];
                    alert(translations[currentLanguage].alertLoadError.replace('{fileName}', file.name));
                    soundData[index] = null;
                    updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey, isLooping: false, isCued: false }, true);
                    saveSettings();
                }
            }

            async function loadSoundFromDataURL(dataUrl, cell, index, name, key, color, isLoopingState, isCuedState) {
                const fixedKey = defaultKeys[index];

                try {
                    const arrayBuffer = dataURLToArrayBuffer(dataUrl);
                    const audioBuffer = await (audioContext || new AudioContext()).decodeAudioData(arrayBuffer);

                    soundData[index] = {
                        name: name || translations[currentLanguage].cellNoName,
                        key: fixedKey,
                        audioBuffer: audioBuffer,
                        audioDataUrl: dataUrl,
                        activePlayingInstances: new Set(),
                        color: color,
                        isLooping: isLoopingState,
                        isCued: isCuedState
                    };
                    updateCellDisplay(cell, soundData[index], false);
                    if (isCuedState) {
                        cuedSounds.add(index);
                    }
                } catch (error) {
                    console.error('Erro ao decodificar áudio do Data URL:', error);
                    alert(translations[currentLanguage].alertDecodeError.replace('{soundName}', name || translations[currentLanguage].cellNoName));
                    soundData[index] = null;
                    updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey, isLooping: false, isCued: false }, true);
                    saveSettings();
                }
            }

            /**
             * Lida com o carregamento de múltiplos ficheiros, distribuindo-os pelas células.
             * @param {File[]} files - Array de objetos File selecionados.
             * @param {number} startCellIndex - O índice da célula onde o carregamento foi iniciado.
             */
            async function handleMultipleFilesLoad(files, startCellIndex) {
                let currentCellIndex = startCellIndex;

                for (const file of files) {
                    let foundSlot = false;
                    // Procura uma célula disponível a partir do currentCellIndex
                    for (let i = currentCellIndex; i < NUM_CELLS; i++) {
                        // Uma célula está disponível se estiver vazia OU se for a célula inicial e a quisermos substituir
                        // A condição `(i === startCellIndex && files.indexOf(file) === 0)` permite substituir o primeiro ficheiro
                        // na célula clicada, mesmo que não estivesse vazia.
                        // Ajustado: Se o primeiro ficheiro está a ser carregado, ele pode substituir a célula de início.
                        // Para os seguintes, ele só pode ir para células vazias.
                        if (soundData[i] === null || (i === startCellIndex && files.indexOf(file) === 0)) {
                            const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                            if (cell) {
                                await loadFileIntoCell(file, cell, i);
                                currentCellIndex = i + 1; // Avança para a próxima célula
                                foundSlot = true;
                                break;
                            }
                        }
                    }

                    if (!foundSlot) {
                        alert(translations[currentLanguage].alertNoEmptyCells.replace('{fileName}', file.name));
                        break; // Para de carregar se não houver mais células disponíveis
                    }
                }
            }

            // --- Atualização Visual da Célula ---
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
                    cuedSounds.delete(parseInt(cell.dataset.index));
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

            // --- Funções de Reprodução e Controlo de Áudio ---
            function playSound(index) {
                const sound = soundData[index];

                if (!sound || !sound.audioBuffer) {
                    return false;
                }

                initAudioContext();

                if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
                    const lastSound = soundData[lastPlayedSoundIndex];
                    if (lastSound) {
                        new Set(lastSound.activePlayingInstances).forEach(instance => {
                            const cell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
                            if (cell) cell.classList.remove('active');
                            fadeoutInstance(instance.source, instance.gain, 0.2);
                            lastSound.activePlayingInstances.delete(instance);
                            globalActivePlayingInstances.delete(instance);
                        });
                        lastSound.activePlayingInstances.clear();
                    }
                }

                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('AudioContext resumed successfully');
                        playActualSound(sound, index, currentFadeInDuration);
                        lastPlayedSoundIndex = index;
                    }).catch(e => console.error('Erro ao retomar AudioContext:', e));
                } else {
                    playActualSound(sound, index, currentFadeInDuration);
                    lastPlayedSoundIndex = index;
                }
                return true;
            }

            function playActualSound(sound, index, fadeInDuration = 0) {
                if (!audioContext || audioContext.state === 'closed') {
                    console.error('AudioContext não está disponível ou está fechado.');
                    return;
                }

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
                        saveSettings();
                    }
                    source.onended = () => {
                        if (!source.loop) {
                            setTimeout(() => {
                                cell.classList.remove('active');
                                sound.activePlayingInstances.delete(playingInstance);
                                globalActivePlayingInstances.delete(playingInstance);
                                if (source.numberOfOutputs > 0) {
                                   source.disconnect();
                                   gainNode.disconnect();
                                }
                            }, 50);
                        }
                    };
                }

                if (!playMultipleCheckbox.checked) {
                    sound.activePlayingInstances.forEach(instance => {
                        if (instance !== playingInstance) {
                            fadeoutInstance(instance.source, instance.gain, 0.1);
                            sound.activePlayingInstances.delete(instance);
                            globalActivePlayingInstances.delete(instance);
                        }
                    });
                }
                source.start(0);
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
                    if (sourceNode.numberOfOutputs > 0) {
                        sourceNode.disconnect();
                        gainNode.disconnect();
                    }
                } else {
                    gainNode.gain.cancelScheduledValues(now);
                    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                    gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

                    const stopTime = now + duration;
                    try {
                        sourceNode.stop(stopTime);
                    } catch (e) {
                        console.warn("Erro ao agendar stop para sourceNode:", e);
                    }

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

                sound.activePlayingInstances.clear();

                if (cell) cell.classList.remove('active');
                console.log(`Sound ${index} fading out over ${duration} seconds.`);
                saveSettings();
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
                            if (instance.source && typeof instance.source.stop === 'function') {
                                instance.source.stop(0);
                            }
                            if (instance.source && instance.source.numberOfOutputs > 0) instance.source.disconnect();
                            if (instance.gain && instance.gain.numberOfOutputs > 0) instance.gain.disconnect();
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

            // --- Funções CUE / GO ---
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
                    console.log("Nenhum som em cue para tocar.");
                    return;
                }

                const soundsToPlay = Array.from(cuedSounds).sort((a, b) => a - b);
                let soundsActuallyPlayed = false;

                soundsToPlay.forEach(index => {
                    const played = playSound(index);
                    if (played) {
                        soundsActuallyPlayed = true;
                    }
                });

                removeAllCues();
                if (soundsActuallyPlayed) {
                    saveSettings();
                }
            }

            function stopCuedSounds() {
                if (cuedSounds.size === 0) {
                    console.log("Nenhum som em cue para parar.");
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
                if (cuedSounds.size === 0) {
                    console.log("Nenhum som em cue para remover.");
                    return;
                }

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

            // --- Funções de Navegação (GO / GO-) ---
            function findNextSoundIndex(startIndex, direction) {
                let currentIndex = startIndex;
                let attempts = 0;
                const maxAttempts = NUM_CELLS;

                while (attempts < maxAttempts) {
                    currentIndex += direction;

                    if (currentIndex >= NUM_CELLS) {
                        currentIndex = 0;
                    } else if (currentIndex < 0) {
                        currentIndex = NUM_CELLS - 1;
                    }

                    if (soundData[currentIndex] && soundData[currentIndex].audioBuffer) {
                        return currentIndex;
                    }

                    attempts++;

                    if (attempts === NUM_CELLS) {
                        return null;
                    }
                }
                return null;
            }


            // --- Event Listeners Globais (Teclado e Controles) ---
            document.addEventListener('keydown', (e) => {
                const pressedKey = e.key.toLowerCase();

                if (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                    return;
                }

                if (pressedKey === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    let targetIndex;

                    if (lastPlayedSoundIndex === null || soundData[lastPlayedSoundIndex] === null) {
                        targetIndex = findNextSoundIndex(-1, 1);
                    } else {
                        targetIndex = findNextSoundIndex(lastPlayedSoundIndex, 1);
                    }

                    if (targetIndex !== null) {
                        playSound(targetIndex);
                    } else {
                        console.log("Não há mais sons para tocar para a frente.");
                    }
                    return;
                } else if (pressedKey === ' ' && e.ctrlKey) {
                    e.preventDefault();
                    let targetIndex;

                    if (lastPlayedSoundIndex === null || soundData[lastPlayedSoundIndex] === null) {
                        targetIndex = findNextSoundIndex(NUM_CELLS, -1);
                    } else {
                        targetIndex = findNextSoundIndex(lastPlayedSoundIndex, -1);
                    }

                    if (targetIndex !== null) {
                        playSound(targetIndex);
                    } else {
                        console.log("Não há mais sons para tocar para trás.");
                    }
                    return;
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.ctrlKey) {
                        if (lastPlayedSoundIndex !== null && soundData[lastPlayedSoundIndex]) {
                            toggleCue(lastPlayedSoundIndex);
                        } else {
                            console.log("Nenhum som foi tocado recentemente para adicionar ao cue.");
                        }
                    } else if (e.shiftKey) {
                        stopCuedSounds();
                    } else if (e.altKey) {
                        removeAllCues();
                    } else {
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
                    fadeInDisplay.textContent = `${currentFadeInDuration}s${translations[currentLanguage].immediateStart || ' (Immediate Start)'}`;
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
                if (audioContext && audioContext.state !== 'closed') {
                    const fadeDuration = 0.2;

                    const instancesToStop = new Set(globalActivePlayingInstances);

                    instancesToStop.forEach(instance => {
                        if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
                            try {
                                fadeoutInstance(instance.source, instance.gain, fadeDuration);
                            } catch (error) {
                                console.warn("Erro ao parar som ou aplicar fade-out em stopAllSounds:", error);
                                if (instance.source && typeof instance.source.stop === 'function') {
                                    instance.source.stop();
                                    if (instance.source.numberOfOutputs > 0) instance.source.disconnect();
                                    if (instance.gain.numberOfOutputs > 0) instance.gain.disconnect();
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
                    saveSettings();
                }
            }

            stopAllSoundsBtn.addEventListener('click', stopAllSounds);

            // loadSoundsButtonGeneral.addEventListener('click', () => { /* Removido */ });

            // --- Inicialização da Aplicação ---

            document.body.addEventListener('click', function firstInteractionHandler() {
                initAudioContext();
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('AudioContext resumed successfully on user interaction.');
                    }).catch(e => console.error('Error resuming AudioContext on user interaction:', e));
                }
                document.body.removeEventListener('click', firstInteractionHandler);
            }, { once: true });

            langButtons.forEach(button => {
                button.addEventListener('click', () => {
                    setLanguage(button.dataset.lang);
                });
            });

            // Event listener para o toggle da ajuda
            helpToggle.addEventListener('click', () => {
                helpList.classList.toggle('hidden');
                helpToggle.classList.toggle('expanded'); // Adiciona/remove classe para rotação do ícone
            });


            loadTranslations().then(() => {
                loadSettings();
                // O estado inicial da ajuda (escondido) é definido pela classe 'hidden' no HTML
                // Se quiser que o estado seja persistido no localStorage, teríamos de adicionar essa lógica
            });

        });
    </script>
