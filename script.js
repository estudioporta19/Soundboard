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
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');
    const fadeOutRange = document.getElementById('fadeOut-range');
    const fadeOutDisplay = document.getElementById('fadeout-display');
    const fadeInRange = document.getElementById('fadeIn-range');
    const fadeInDisplay = document.getElementById('fadeIn-display');
    const langButtons = document.querySelectorAll('.lang-button');

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
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Reproduzir Múltiplos", autokillLabel: "Auto-Kill Anterior", loadMultipleSoundsButton: "Carregar Múltiplos Sons", stopAllSoundsButton: "Parar Todos os Sons (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Início Imediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Paragem Imediata)", howToUseTitle: "Como Usar:", dragDropHelp: "<strong>Arrastar e Largar:</strong> Arraste ficheiros de áudio (MP3, WAV, OGG) para as células para as preencher.", clickHelp: "<strong>Clicar:</strong> Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.", shortcutsHelp: "<strong>Atalhos de Teclado:</strong> Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: Q para a primeira célula).", navigationHelp: "<strong>Navegação (Modo QLab):</strong> Pressione <kbd>Espaço</kbd> para tocar o próximo som disponível. Pressione <kbd>Ctrl</kbd> + <kbd>Espaço</kbd> para tocar o som disponível anterior. Células vazias são ignoradas.", stopAllHelp: "<strong>Parar Sons:</strong> Pressione <kbd>ESC</kbd> para parar todos os sons a tocar.", volumeHelp: "<strong>Ajustar Volume:</strong> Use o slider de volume ou as teclas <kbd>⬆️</kbd> e <kbd>⬇️</kbd> para controlar o volume global.", deleteSoundHelp: "<strong>Apagar Som:</strong> Clique no <span style=\"font-size:1.1em;\">❌</span> no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga; um clique longo (>0.5s) faz fade out.*", replaceSoundHelp: "<strong>Substituir Som:</strong> Clique no <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> para carregar um novo som para a célula.", renameHelp: "<strong>Mudar Nome:</strong> Clique no nome do som para editá-lo.", fadeInHelp: "<strong>Controlar Fade In:</strong> Use o slider de Fade In, ou as teclas <kbd>Ctrl</kbd> + teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade in em segundos.", fadeOutControlHelp: "<strong>Controlar Fade Out:</strong> Use o slider de Fade Out, ou as teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade out em segundos.", playMultipleModeHelp: "<strong>Modo Reproduzir Múltiplos:</strong> Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.", autokillModeHelp: "<strong>Modo Auto-Kill Anterior:</strong> Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.", alertInvalidFile: "Tipo de ficheiro inválido. Por favor, arraste ficheiros de áudio (MP3, WAV, OGG).", alertLoadError: "Não foi possível carregar o áudio '{fileName}'.", alertDecodeError: "Erro ao descodificar o áudio '{soundName}'.", alertNoEmptyCells: "Não há mais células vazias para carregar o ficheiro '{fileName}'.", cellEmptyText: "Clique para carregar o som", cellNoName: "Sem Nome", cellEmptyDefault: "Vazio", loopButtonTitle: "Ativar/Desativar Loop", cueHelp: "<strong>CUE / GO:</strong> Pressione <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para 'cue' (marcar) um som. Pressione <kbd>Enter</kbd> para tocar todos os sons em 'cue' com fade-in. Pressione <kbd>Shift</kbd> + <kbd>Enter</kbd> para parar todos os sons em 'cue' com fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Pressione <kbd>Ctrl</kbd> + clique na célula para adicionar/remover um som do 'cue'.", removeCueHelp: "<strong>Remover CUE:</strong> Pressione <kbd>Alt</kbd> + <kbd>Enter</kbd> para remover todos os sons do 'cue' sem os parar.",
                },
                en: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Play Multiple", autokillLabel: "Auto-Kill Previous", loadMultipleSoundsButton: "Load Multiple Sounds", stopAllSoundsButton: "Stop All Sounds (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Immediate Start)", fadeOutLabel: "Fade Out:", immediateStop: " (Immediate Stop)", howToUseTitle: "How To Use:", dragDropHelp: "<strong>Drag & Drop:</strong> Drag audio files (MP3, WAV, OGG) onto cells to fill them.", clickHelp: "<strong>Click:</strong> Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.", shortcutsHelp: "<strong>Keyboard Shortcuts:</strong> Press the corresponding key on your keyboard to play the sound. (e.g., Q for the first cell).", navigationHelp: "<strong>Navigation (QLab Mode):</strong> Press <kbd>Space</kbd> to play the next available sound. Press <kbd>Ctrl</kbd> + <kbd>Space</kbd> to play the previous available sound. Empty cells are skipped.", stopAllHelp: "<strong>Stop Sounds:</strong> Press <kbd>ESC</kbd> to stop all playing sounds.", volumeHelp: "<strong>Adjust Volume:</strong> Use the volume slider or the <kbd>⬆️</kbd> and <kbd>⬇️</kbd> keys to control global volume.", deleteSoundHelp: "<strong>Delete Sound:</strong> Click the <span style=\"font-size:1.1em;\">❌</span> in the top right corner of a cell to clear it. *A quick click deletes; a long click (>0.5s) fades out.*", replaceSoundHelp: "<strong>Replace Sound:</strong> Click the <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> to upload a new sound to the cell.", renameHelp: "<strong>Rename Sound:</strong> Click the sound's name to edit it.", fadeInHelp: "<strong>Control Fade In:</strong> Use the Fade In slider, or press <kbd>Ctrl</kbd> + number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-in duration in seconds.", fadeOutControlHelp: "<strong>Control Fade Out:</strong> Use the Fade Out slider, or press number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-out duration in seconds.", playMultipleModeHelp: "<strong>Play Multiple Mode:</strong> Allows multiple sounds to play simultaneously if checked.", autokillModeHelp: "<strong>Auto-Kill Previous Mode:</strong> When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.", alertInvalidFile: "Invalid file type. Please drag audio files (MP3, WAV, OGG).", alertLoadError: "Could not load audio '{fileName}'.", alertDecodeError: "Error decoding audio '{soundName}'.", alertNoEmptyCells: "No more empty cells to load file '{fileName}'.", cellEmptyText: "Click to load sound", cellNoName: "No Name", cellEmptyDefault: "Empty", loopButtonTitle: "Loop (Toggle)", cueHelp: "<strong>CUE / GO:</strong> Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to 'cue' (mark) a sound. Press <kbd>Enter</kbd> to play all 'cued' sounds with fade-in. Press <kbd>Shift</kbd> + <kbd>Enter</kbd> to stop all 'cued' sounds with fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Press <kbd>Ctrl</kbd> + click on the cell to add/remove a sound from 'cue'.", removeCueHelp: "<strong>Remove CUE:</strong> Press <kbd>Alt</kbd> + <kbd>Enter</kbd> to remove all cued sounds without stopping them.",
                },
                it: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Riproduci Multipli", autokillLabel: "Auto-Stop Precedente", loadMultipleSoundsButton: "Carica Più Suoni", stopAllSoundsButton: "Ferma Tutti i Suoni (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Avvio Immediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Arresto Immediato)", howToUseTitle: "Come Usare:", dragDropHelp: "<strong>Trascina e Rilascia:</strong> Trascina file audio (MP3, WAV, OGG) sulle celle per riempirle.", clickHelp: "<strong>Clicca:</strong> Clicca una cella vuota per aprire una finestra di selezione file. Clicca una cella piena per riprodurre il suono.", shortcutsHelp: "<strong>Scorciatoie da Tastiera:</strong> Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: Q per la prima cella).", navigationHelp: "<strong>Navigazione (Modalità QLab):</strong> Premi <kbd>Spazio</kbd> per riprodurre il prossimo suono disponibile. Premi <kbd>Ctrl</kbd> + <kbd>Spazio</kbd> per riprodurre il suono disponibile precedente. Le celle vuote vengono saltate.", stopAllHelp: "<strong>Ferma Suoni:</strong> Premi <kbd>ESC</kbd> per fermare tutti i suoni in riproduzione.", volumeHelp: "<strong>Regola Volume:</strong> Usa il cursore del volume o i tasti <kbd>⬆️</kbd> e <kbd>⬇️</kbd> per controllare il volume globale.", deleteSoundHelp: "<strong>Elimina Suono:</strong> Clicca sulla <span style=\"font-size:1.1em;\">❌</span> nell'angolo in alto a destra di una cella per svuotarla. *Un clic rapido elimina; un clic lungo (>0.5s) esegue il fade out.*", replaceSoundHelp: "<strong>Sostituisci Suono:</strong> Clicca su <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> para carregar um novo suono na cella.", renameHelp: "<strong>Rinomina Suono:</strong> Clicca sul nome del suono per modificarlo.", fadeInHelp: "<strong>Controlla Fade In:</strong> Usa lo slider Fade In, o premi <kbd>Ctrl</kbd> + tasti numerici <kbd>0</kbd>-<kbd>9</kbd> per impostare a durata do fade-in em segundos.", fadeOutControlHelp: "<strong>Controlla Fade Out:</strong> Usa lo slider Fade Out, o premi i tasti numerici <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade-out em segundos.", playMultipleModeHelp: "<strong>Modalità Riproduci Multipli:</strong> Permette a più suoni di essere riprodotti contemporaneamente se la casella è selezionata.", autokillModeHelp: "<strong>Modalità Auto-Stop Precedente:</strong> Quando viene riprodotto un nuovo suono, o som anteriormente ativo (se presente) verrà fermato com um rapido fade out.", alertInvalidFile: "Tipo de file non valido. Si prega de trascinare file audio (MP3, WAV, OGG).", alertLoadError: "Impossibile caricare l'audio '{fileName}'.", alertDecodeError: "Errore durante la decodifica dell'audio '{soundName}'.", alertNoEmptyCells: "Non ci sono più celle vuote per caricare il file '{fileName}'.", cellEmptyText: "Clicca per caricare il suono", cellNoName: "Senza Nome", cellEmptyDefault: "Vuoto", loopButtonTitle: "Loop (Attiva/Disattiva)", cueHelp: "<strong>CUE / GO:</strong> Premi <kbd>Ctrl</kbd> + <kbd>Invio</kbd> per 'cue' (segnare) un suono. Premi <kbd>Invio</kbd> per riprodurre tutti i suoni in 'cue' con fade-in. Premi <kbd>Shift</kbd> + <kbd>Invio</kbd> per fermare tutti i suoni in 'cue' con fade-out.", cueSingleHelp: "<strong>CUE Individuale:</strong> Premi <kbd>Ctrl</kbd> + clic sulla cella per aggiungere/rimuovere un suono dal 'cue'.", removeCueHelp: "<strong>Rimuovi CUE:</strong> Premi <kbd>Alt</kbd> + <kbd>Invio</kbd> per rimuovere tutti i suoni in cue senza fermarli.",
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
                // Apenas atualizar o texto se não for um input range ou checkbox (que são labels separadas)
                if (element.tagName === 'INPUT' && (element.type === 'range' || element.type === 'checkbox' || element.type === 'radio')) {
                    // Não faz nada para estes inputs, as suas labels é que são traduzidas
                } else {
                    element.innerHTML = translations[lang][key]; // Usa innerHTML para permitir tags como <kbd> e <strong>
                }
            }
        });

        // Traduzir elementos que não têm data-key mas dependem do idioma
        updateFadeOutDisplay();
        updateFadeInDisplay();

        // Atualiza o texto de células vazias e tooltips
        document.querySelectorAll('.sound-cell').forEach(cell => {
            const index = parseInt(cell.dataset.index);
            const data = soundData[index];

            const nameDisplay = cell.querySelector('.sound-name');
            if (nameDisplay) {
                // Se a célula estiver vazia, define o texto de vazio. Caso contrário, mantém o nome do som.
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

            // Atualiza a classe 'active' para o loop button com base no estado salvo
            if (loopButton) {
                if (data && data.isLooping) {
                    loopButton.classList.add('active');
                } else {
                    loopButton.classList.remove('active');
                }
            }
        });

        // Atualiza a seleção do botão de idioma
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

    // Função auxiliar para converter Data URL para ArrayBuffer
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

        // Restaurar configurações globais
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

        // Criar células e carregar sons (se existirem)
        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i); // Cria a célula, que é inicialmente vazia

            const fixedKey = defaultKeys[i]; // Define fixedKey aqui para que esteja sempre disponível

            if (cellData && cellData.audioDataUrl) {
                const color = cellData.color || getRandomHSLColor();
                const isLooping = cellData.isLooping !== undefined ? cellData.isLooping : false;
                const isCued = cellData.isCued !== undefined ? cellData.isCued : false; // Carrega também o estado de cue
                // loadSoundFromDataURL agora espera um dataURL completo
                loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, fixedKey, color, isLooping, isCued);
            } else {
                // Certifica-se de que a soundData para esta célula está vazia
                soundData[i] = null;
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey, isLooping: false, isCued: false }, true);
            }
        }
        // Se houver sons em cue no localStorage, restaurá-los
        if (savedSettings.cuedSounds && Array.isArray(savedSettings.cuedSounds)) {
            savedSettings.cuedSounds.forEach(idx => {
                if (soundData[idx]) { // Apenas se o som ainda existir
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
            cuedSounds: Array.from(cuedSounds), // Salva os índices dos sons em cue
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null,
                audioDataUrl: data ? data.audioDataUrl : null, // Salva a data URL completa
                color: data ? data.color : null,
                isLooping: data ? data.isLooping : false,
                isCued: data ? data.isCued : false // Salva o estado de cue por célula também
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

        // Adiciona a célula à linha correta
        if (index >= 0 && index < 10) {
            rowTop.appendChild(cell);
        } else if (index >= 10 && index < 19) {
            rowHome.appendChild(cell);
        } else if (index >= 19 && index < 26) {
            rowBottom.appendChild(cell);
        } else {
            console.warn(`Índice de célula fora do esperado: ${index}`);
            soundboardGrid.appendChild(cell); // Fallback
        }

        setupCellEvents(cell, index);

        // Inicializa soundData para null, será preenchido se um som for carregado
        soundData[index] = null;

        return cell;
    }

    function setupCellEvents(cell, index) {
        // Drag & Drop
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
            if (file && (file.type.startsWith('audio/'))) { // Verifica se é um tipo de áudio
                loadFileIntoCell(file, cell, index);
            } else {
                alert(translations[currentLanguage].alertInvalidFile);
            }
        });

        // Clique na célula (para tocar ou carregar)
        cell.addEventListener('click', (e) => {
            // Se Ctrl + Clique, é para cue
            if (e.ctrlKey) {
                e.stopPropagation();
                toggleCue(index);
                return;
            }

            // Ignorar cliques nos botões ou no nome
            if (e.target.closest('.delete-button') ||
                e.target.closest('.replace-sound-button') ||
                e.target.closest('.loop-button') ||
                e.target.closest('.sound-name')) {
                e.stopPropagation();
                return;
            }

            // Se célula vazia, abre seletor de ficheiro
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
                // Se célula tem som, toca o som
                playSound(index);
            }
        });

        // Edição do nome do som
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

        // Botão de Eliminar (clique rápido = apaga, clique longo = fade out)
        const deleteButton = cell.querySelector('.delete-button');
        let pressTimer;
        const longPressDuration = 500; // 0.5 segundos

        deleteButton.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            pressTimer = setTimeout(() => {
                if (soundData[index] && soundData[index].audioBuffer) {
                    fadeoutSound(index, currentFadeOutDuration);
                }
                pressTimer = null; // Reseta o timer para indicar que um clique longo ocorreu
            }, longPressDuration);
        });

        deleteButton.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            if (pressTimer !== null) { // Se o timer ainda estiver ativo (não foi um clique longo)
                clearTimeout(pressTimer);
                if (e.button === 0 && !cell.classList.contains('empty')) { // Apenas clique esquerdo e se não estiver vazia
                    clearSoundCell(index, 0.1); // Fade out rápido ao apagar
                }
            }
            pressTimer = null; // Garante que o timer é resetado
        });

        deleteButton.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer); // Cancela o timer se o mouse sair do botão
            pressTimer = null;
        });

        deleteButton.addEventListener('contextmenu', (e) => { // Previne o menu de contexto no clique direito
            e.preventDefault();
        });

        // Botão de Substituir Som
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

        // Botão de Loop
        const loopButton = cell.querySelector('.loop-button');
        loopButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (soundData[index]) {
                soundData[index].isLooping = !soundData[index].isLooping;
                loopButton.classList.toggle('active', soundData[index].isLooping);
                saveSettings();

                // Atualiza o estado de loop das instâncias ativas
                soundData[index].activePlayingInstances.forEach(instance => {
                    instance.source.loop = soundData[index].isLooping;
                });
            }
        });
    }

    // --- Funções de Carregamento de Áudio ---
    async function loadFileIntoCell(file, cell, index, nameOverride = null) {
        const readerArrayBuffer = new FileReader();
        const readerDataURL = new FileReader(); // Segundo FileReader para a Data URL

        // Promessas para garantir que ambos os FileReaders terminam
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
            const dataUrl = await dataURLPromise; // Obtém a Data URL completa

            // decodeAudioData pode ser chamado mesmo com o AudioContext suspenso
            const audioBuffer = await (audioContext || new AudioContext()).decodeAudioData(arrayBuffer);

            const defaultName = nameOverride || file.name.replace(/\.[^/.]+$/, "");
            const fixedKey = defaultKeys[index];

            const cellColor = getRandomHSLColor();

            // Limpa qualquer som anterior nesta célula
            if (soundData[index]) {
                clearSoundData(index);
            }

            soundData[index] = {
                name: defaultName,
                key: fixedKey,
                audioBuffer: audioBuffer,
                audioDataUrl: dataUrl, // Armazena a Data URL completa para persistência
                activePlayingInstances: new Set(),
                color: cellColor,
                isLooping: false,
                isCued: false
            };
            updateCellDisplay(cell, soundData[index], false);
            saveSettings();

        } catch (error) {
            console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
            const fixedKey = defaultKeys[index]; // Garante que fixedKey está disponível aqui
            alert(translations[currentLanguage].alertLoadError.replace('{fileName}', file.name));
            soundData[index] = null;
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey, isLooping: false, isCued: false }, true);
            saveSettings();
        }
    }

    async function loadSoundFromDataURL(dataUrl, cell, index, name, key, color, isLoopingState, isCuedState) {
        const fixedKey = defaultKeys[index]; // Garante que fixedKey está sempre disponível

        try {
            // Converte o Data URL para ArrayBuffer para decodificar
            const arrayBuffer = dataURLToArrayBuffer(dataUrl);
            const audioBuffer = await (audioContext || new AudioContext()).decodeAudioData(arrayBuffer);

            soundData[index] = {
                name: name || translations[currentLanguage].cellNoName,
                key: fixedKey,
                audioBuffer: audioBuffer,
                audioDataUrl: dataUrl, // Mantém a dataURL completa
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

    // --- Atualização Visual da Célula ---
    function updateCellDisplay(cell, data, isEmpty) {
        const nameDisplay = cell.querySelector('.sound-name');
        const keyDisplayBottom = cell.querySelector('.key-display-bottom');
        const deleteButton = cell.querySelector('.delete-button');
        const replaceButton = cell.querySelector('.replace-sound-button');
        const loopButton = cell.querySelector('.loop-button');

        if (isEmpty) {
            cell.classList.add('empty');
            cell.classList.remove('cued', 'active'); // Remove cued e active se estiver vazia
            nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
            nameDisplay.contentEditable = false;
            deleteButton.style.display = 'none';
            replaceButton.style.display = 'none';
            loopButton.style.display = 'none';
            cell.style.backgroundColor = 'transparent';
            loopButton.classList.remove('active');
            // Remove do cue set se for esvaziada
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
            // Define o estado de cue visual
            if (data.isCued) {
                cell.classList.add('cued');
                cuedSounds.add(parseInt(cell.dataset.index)); // Garante que está no set
            } else {
                cell.classList.remove('cued');
                cuedSounds.delete(parseInt(cell.dataset.index)); // Garante que não está no set
            }
        }
        keyDisplayBottom.textContent = defaultKeys[cell.dataset.index] ? defaultKeys[cell.dataset.index].toUpperCase() : '';
    }

    // --- Funções de Reprodução e Controlo de Áudio ---
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

        initAudioContext(); // Garante que o AudioContext está inicializado (se não estiver, resume)

        // Aplicar auto-kill ao som anteriormente tocado, se houver e o modo estiver ativado.
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            const lastSound = soundData[lastPlayedSoundIndex];
            if (lastSound) {
                // Itera sobre uma cópia do Set para evitar problemas ao modificar durante a iteração
                new Set(lastSound.activePlayingInstances).forEach(instance => {
                    const cell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
                    if (cell) cell.classList.remove('active');
                    fadeoutInstance(instance.source, instance.gain, 0.2); // Fade out rápido
                    lastSound.activePlayingInstances.delete(instance); // Remove da lista de instâncias ativas do som
                    globalActivePlayingInstances.delete(instance); // Remove da lista global
                });
                lastSound.activePlayingInstances.clear(); // Garante que o Set está limpo
            }
        }

        // Tenta retomar o AudioContext se estiver suspenso
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
            if (sound.isCued) { // Se o som estava em cue, desmarca-o após reprodução
                sound.isCued = false;
                cell.classList.remove('cued');
                cuedSounds.delete(index);
                saveSettings(); // Salva o estado atualizado do cue
            }
            source.onended = () => {
                // Apenas remove a classe 'active' e limpa as referências se não estiver em loop
                if (!source.loop) {
                    // Pequeno atraso para garantir que a transição visual é suave
                    setTimeout(() => {
                        cell.classList.remove('active');
                        sound.activePlayingInstances.delete(playingInstance);
                        globalActivePlayingInstances.delete(playingInstance);
                        // Apenas desconecta se não houver outras referências ativas (para evitar desconectar antes de outros stop)
                        // ou se a sourceNode não foi já desconectada (e.g. por um stopAllSounds ou autokill)
                        if (source.numberOfOutputs > 0) { // Verifica se ainda está conectado
                           source.disconnect();
                           gainNode.disconnect();
                        }
                    }, 50); // Ajuste este valor se a transição parecer brusca
                }
            };
        }

        // Se o modo 'playMultiple' não estiver ativo, para outras instâncias do MESMO som
        if (!playMultipleCheckbox.checked) {
            // Parar outras instâncias ativas do MESMO som (garantir que apenas uma instância toca por som)
            sound.activePlayingInstances.forEach(instance => {
                if (instance !== playingInstance) {
                    fadeoutInstance(instance.source, instance.gain, 0.1); // Fade out rápido
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
            gainNode.gain.setValueAtTime(0, now); // Define o ganho para 0 imediatamente
            try {
                sourceNode.stop(); // Interrompe imediatamente
            } catch (e) {
                console.warn("Erro ao parar sourceNode:", e);
            }
            if (sourceNode.numberOfOutputs > 0) {
                sourceNode.disconnect();
                gainNode.disconnect();
            }
        } else {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now); // Começa do valor atual
            gainNode.gain.linearRampToValueAtTime(0.0001, now + duration); // Fade para quase 0

            const stopTime = now + duration;
            try {
                sourceNode.stop(stopTime); // Agendada para parar após o fade
            } catch (e) {
                console.warn("Erro ao agendar stop para sourceNode:", e);
            }

            // Garante desconexão após o fade-out
            setTimeout(() => {
                if (sourceNode.numberOfOutputs > 0) { // Verifica se ainda está conectado
                    sourceNode.disconnect();
                    gainNode.disconnect();
                }
            }, duration * 1000 + 100); // Dá um pequeno tempo extra para o fade terminar
        }
    }

    function fadeoutSound(index, duration) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext(); // Garante que o AudioContext está pronto

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);

        // Cria uma cópia do Set para iterar, pois o Set será modificado
        const instancesToFade = new Set(sound.activePlayingInstances);

        instancesToFade.forEach(instance => {
            fadeoutInstance(instance.source, instance.gain, duration);
            // Remove a instância das listas de controlo IMEDIATAMENTE
            sound.activePlayingInstances.delete(instance);
            globalActivePlayingInstances.delete(instance);
        });

        // Limpa o Set de instâncias ativas do som
        sound.activePlayingInstances.clear();

        if (cell) cell.classList.remove('active');
        console.log(`Sound ${index} fading out over ${duration} seconds.`);
        saveSettings(); // Garante que o estado de cue é salvo se mudou
    }

    function clearSoundCell(index, fadeDuration = 0.1) {
        const sound = soundData[index];
        if (!sound) {
            return;
        }

        fadeoutSound(index, fadeDuration); // Primeiro, faz o fade out do som

        // Dá um pequeno atraso para o fade out acontecer antes de limpar os dados
        setTimeout(() => {
            clearSoundData(index); // Limpa os dados na memória
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '', isLooping: false, isCued: false }, true);
                cell.classList.remove('active');
                cell.classList.remove('cued');
            }
            saveSettings(); // Salva o estado após a limpeza
            if (lastPlayedSoundIndex === index) {
                lastPlayedSoundIndex = null; // Reseta o cursor se a célula limpa era a última tocada
            }
            console.log(`Célula ${index} limpa.`);
        }, fadeDuration * 1000 + 100); // Atraso ligeiramente maior que a duração do fade
    }

    function clearSoundData(index) {
        const sound = soundData[index];
        if (sound && sound.activePlayingInstances) {
            // Garante que todas as instâncias a tocar são paradas e desconectadas
            sound.activePlayingInstances.forEach(instance => {
                try {
                    // Parar e desconectar a sourceNode e gainNode
                    if (instance.source && typeof instance.source.stop === 'function') {
                        instance.source.stop(0);
                    }
                    if (instance.source && instance.source.numberOfOutputs > 0) instance.source.disconnect();
                    if (instance.gain && instance.gain.numberOfOutputs > 0) instance.gain.disconnect();
                } catch (e) {
                    console.warn("Erro ao desconectar instância de áudio ao limpar dados:", e);
                }
                globalActivePlayingInstances.delete(instance); // Remove da lista global
            });
            sound.activePlayingInstances.clear(); // Limpa o Set de instâncias ativas do som
        }
        // Garante que o estado de cue é removido
        if (soundData[index]) {
            soundData[index].isCued = false;
        }
        cuedSounds.delete(index); // Remove do Set de sons em cue
        soundData[index] = null; // Define o slot como vazio
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

        // Criar uma cópia e ordenar para reprodução consistente (opcional, mas bom)
        const soundsToPlay = Array.from(cuedSounds).sort((a, b) => a - b);
        let soundsActuallyPlayed = false;

        soundsToPlay.forEach(index => {
            const played = playSound(index); // playSound já trata do fade-in e desmarca o cue
            if (played) {
                soundsActuallyPlayed = true;
            }
        });

        // Limpa todos os cues após tentar tocar
        removeAllCues(); // Chama a função para limpar o estado visual e o Set
        if (soundsActuallyPlayed) {
            saveSettings(); // Apenas salva se realmente tentou tocar algum som
        }
    }

    function stopCuedSounds() {
        if (cuedSounds.size === 0) {
            console.log("Nenhum som em cue para parar.");
            return;
        }

        // Cria uma cópia do Set, pois ele será modificado ao parar
        const soundsToStop = Array.from(cuedSounds);
        soundsToStop.forEach(index => {
            fadeoutSound(index, currentFadeOutDuration); // fadeoutSound já remove da lista de instâncias ativas
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell && soundData[index]) {
                soundData[index].isCued = false; // Desmarca o cue
                cell.classList.remove('cued');
            }
        });
        cuedSounds.clear(); // Limpa o Set de sons em cue
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
                soundData[index].isCued = false; // Desmarca o cue nos dados do som
                cell.classList.remove('cued'); // Remove o estilo visual
            }
        });
        cuedSounds.clear(); // Limpa o Set global de sons em cue
        saveSettings();
    }

    // --- Funções de Navegação (GO / GO-) ---
    // Função auxiliar para encontrar a próxima/anterior célula com som
    function findNextSoundIndex(startIndex, direction) {
        let currentIndex = startIndex;
        let attempts = 0;
        const maxAttempts = NUM_CELLS; // Limitar tentativas ao número de células

        while (attempts < maxAttempts) {
            currentIndex += direction;

            // Lógica de "wrap around"
            if (currentIndex >= NUM_CELLS) {
                currentIndex = 0;
            } else if (currentIndex < 0) {
                currentIndex = NUM_CELLS - 1;
            }

            // Se encontrarmos um som carregado, retornamos o índice
            if (soundData[currentIndex] && soundData[currentIndex].audioBuffer) {
                return currentIndex;
            }

            attempts++;

            // Se já varremos todas as células e não encontramos nada, ou voltamos ao ponto de partida
            if (attempts === NUM_CELLS) {
                return null;
            }
        }
        return null; // Não encontrou nenhum som
    }


    // --- Event Listeners Globais (Teclado e Controles) ---
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        // Evita que os atalhos de teclado interfiram com inputs de texto
        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            return;
        }

        // Lógica para Space e Ctrl + Space (GO / GO-)
        if (pressedKey === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) { // Apenas Space (GO)
            e.preventDefault();
            let targetIndex;

            if (lastPlayedSoundIndex === null || soundData[lastPlayedSoundIndex] === null) {
                // Se nenhum som foi tocado ainda ou o último tocado foi apagado, começa a procurar a partir do -1
                targetIndex = findNextSoundIndex(-1, 1);
            } else {
                targetIndex = findNextSoundIndex(lastPlayedSoundIndex, 1);
            }

            if (targetIndex !== null) {
                playSound(targetIndex); // playSound já atualiza lastPlayedSoundIndex
            } else {
                console.log("Não há mais sons para tocar para a frente.");
            }
            return;
        } else if (pressedKey === ' ' && e.ctrlKey) { // Ctrl + Space (GO-)
            e.preventDefault();
            let targetIndex;

            if (lastPlayedSoundIndex === null || soundData[lastPlayedSoundIndex] === null) {
                // Se nenhum som foi tocado ainda ou o último tocado foi apagado, começa a procurar a partir do NUM_CELLS
                targetIndex = findNextSoundIndex(NUM_CELLS, -1);
            } else {
                targetIndex = findNextSoundIndex(lastPlayedSoundIndex, -1);
            }

            if (targetIndex !== null) {
                playSound(targetIndex); // playSound já atualiza lastPlayedSoundIndex
            } else {
                console.log("Não há mais sons para tocar para trás.");
            }
            return;
        }

        // Atalhos de teclado para Cue/Go/Stop Cued/Remove Cues
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.ctrlKey) { // Ctrl + Enter: Adiciona/remove o último som tocado do cue
                if (lastPlayedSoundIndex !== null && soundData[lastPlayedSoundIndex]) {
                    toggleCue(lastPlayedSoundIndex);
                } else {
                    console.log("Nenhum som foi tocado recentemente para adicionar ao cue.");
                }
            } else if (e.shiftKey) { // Shift + Enter: Para todos os sons em cue
                stopCuedSounds();
            } else if (e.altKey) { // Alt + Enter: Remove todos os cues sem os parar
                removeAllCues();
            } else { // Enter (sem modificadores): Toca todos os sons em cue
                playCuedSounds();
            }
            return;
        }

        // Atalhos para Volume (setas cima/baixo)
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
        } else if (pressedKey === 'escape') { // Parar todos os sons (ESC)
            stopAllSounds();
        } else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') { // Ctrl + 0-9 para Fade In
            e.preventDefault();
            fadeInRange.value = parseInt(pressedKey);
            currentFadeInDuration = parseFloat(fadeInRange.value);
            updateFadeInDisplay();
            saveSettings();
        } else if (pressedKey >= '0' && pressedKey <= '9' && !e.ctrlKey && !e.altKey && !e.shiftKey) { // 0-9 para Fade Out
            e.preventDefault();
            fadeOutRange.value = parseInt(pressedKey);
            currentFadeOutDuration = parseFloat(fadeOutRange.value);
            updateFadeOutDisplay();
            saveSettings();
        } else { // Atalhos QWERTY
            const indexToPlay = defaultKeys.indexOf(pressedKey);
            if (indexToPlay !== -1 && soundData[indexToPlay] && soundData[indexToPlay].audioBuffer) {
                playSound(indexToPlay);
            }
        }
    });

    // Event listeners para sliders de volume e fade
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
            fadeInDisplay.textContent = `Loading...`; // Estado de carregamento
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
            fadeOutDisplay.textContent = `Loading...`; // Estado de carregamento
            return;
        }
        if (currentFadeOutDuration === 0) {
            fadeOutDisplay.textContent = `${currentFadeOutDuration}s${translations[currentLanguage].immediateStop || ' (Immediate Stop)'}`;
        } else {
            fadeOutDisplay.textContent = `${currentFadeOutDuration}s`;
        }
    }

    // Event listeners para checkboxes de modo de reprodução
    playMultipleCheckbox.addEventListener('change', () => {
        saveSettings();
    });

    autokillModeCheckbox.addEventListener('change', () => {
        saveSettings();
    });

    // Botão "Parar Todos os Sons"
    function stopAllSounds() {
        if (audioContext && audioContext.state !== 'closed') {
            const fadeDuration = 0.2; // Fade out rápido para todos

            // Criar uma cópia do Set para iterar, pois ele será modificado
            const instancesToStop = new Set(globalActivePlayingInstances);

            instancesToStop.forEach(instance => {
                if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
                    try {
                        fadeoutInstance(instance.source, instance.gain, fadeDuration);
                    } catch (error) {
                        console.warn("Erro ao parar som ou aplicar fade-out em stopAllSounds:", error);
                        // Fallback para parada imediata se o fade falhar
                        if (instance.source && typeof instance.source.stop === 'function') {
                            instance.source.stop();
                            if (instance.source.numberOfOutputs > 0) instance.source.disconnect();
                            if (instance.gain.numberOfOutputs > 0) instance.gain.disconnect();
                        }
                    }
                }
                globalActivePlayingInstances.delete(instance); // Remove da lista global
            });

            globalActivePlayingInstances.clear(); // Garante que o Set global está limpo

            // Remove a classe 'active' de todas as células visuais
            document.querySelectorAll('.sound-cell.active').forEach(cell => {
                cell.classList.remove('active');
            });

            // Limpa as instâncias ativas de cada objeto soundData
            soundData.forEach(sound => {
                if (sound && sound.activePlayingInstances) {
                    sound.activePlayingInstances.clear();
                }
            });
            lastPlayedSoundIndex = null; // Reseta o cursor
            saveSettings(); // Salva o estado atualizado (sem sons ativos)
        }
    }

    stopAllSoundsBtn.addEventListener('click', stopAllSounds);

    // Botão "Carregar Múltiplos Sons"
    loadSoundsButtonGeneral.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/mp3, audio/wav, audio/ogg';
        input.multiple = true;

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            let startIndex = 0; // Começa a procurar por células vazias a partir do início

            for (const file of files) {
                let foundEmptyCell = false;
                for (let i = startIndex; i < NUM_CELLS; i++) {
                    // Verifica se a célula está logicamente vazia
                    if (soundData[i] === null || (soundData[i] && soundData[i].audioBuffer === null)) {
                        const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                        await loadFileIntoCell(file, cell, i);
                        startIndex = i + 1; // Próxima busca começa depois da célula preenchida
                        foundEmptyCell = true;
                        break;
                    }
                }
                if (!foundEmptyCell) {
                    alert(translations[currentLanguage].alertNoEmptyCells.replace('{fileName}', file.name));
                    break; // Para de carregar se não houver mais células vazias
                }
            }
        };
        input.click();
    });

    // --- Inicialização da Aplicação ---

    // Este listener garante que o AudioContext é inicializado e resumido na primeira interação
    // do utilizador, prevenindo erros de autoplay ao recarregar a página.
    document.body.addEventListener('click', function firstInteractionHandler() {
        initAudioContext(); // Inicializa o AudioContext
        // Tenta retomar se estiver suspenso
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully on user interaction.');
            }).catch(e => console.error('Error resuming AudioContext on user interaction:', e));
        }
        // Remove este listener após a primeira interação para que não seja chamado repetidamente
        document.body.removeEventListener('click', firstInteractionHandler);
    }, { once: true }); // O { once: true } faz com que o listener seja executado apenas uma vez.

    // Configura os botões de idioma
    langButtons.forEach(button => {
        button.addEventListener('click', () => {
            setLanguage(button.dataset.lang);
        });
    });

    // Carrega as traduções primeiro, e só depois as configurações e sons
    // loadSettings não ativa o AudioContext, apenas carrega dados.
    loadTranslations().then(() => {
        loadSettings();
        // A função setLanguage é chamada dentro de loadTranslations() para garantir a tradução inicial.
    });

});
