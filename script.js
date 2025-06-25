document.addEventListener('DOMContentLoaded', () => {
    // Variáveis globais
    let audioContext = null;
    let masterGainNode = null;
    const soundData = []; // Array para armazenar os dados de cada célula
    const NUM_CELLS = 27; // Número total de células (9 por linha)
    const defaultKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o',
                         'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
                         'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'];
    let currentLanguage = 'pt';
    let translations = {};
    const cuedSounds = new Set(); // Conjunto para armazenar índices de sons "cued"
    let lastPlayedSoundIndex = null; // Para o modo QLab "GO"

    // Elementos do DOM
    const soundboardGrid = document.querySelector('.soundboard-grid');
    const rowTop = document.getElementById('row-top');
    const rowHome = document.getElementById('row-home');
    const rowBottom = document.getElementById('row-bottom');

    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const fadeInRange = document.getElementById('fadeIn-range');
    const fadeInDisplay = document.getElementById('fadeIn-display');
    const fadeOutRange = document.getElementById('fadeOut-range');
    const fadeOutDisplay = document.getElementById('fadeout-display'); // Corrigido para fadeout-display
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const autokillModeCheckbox = document.getElementById('autokill-mode');
    const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');
    const langButtons = document.querySelectorAll('.lang-button');
    const globalActivePlayingInstances = new Set(); // Para controlar todas as instâncias de áudio ativas

    // Elementos do Modal (assumindo que existem no HTML)
    const cellSettingsModal = document.getElementById('cellSettingsModal');
    const closeModalButton = cellSettingsModal ? cellSettingsModal.querySelector('.close-button') : null;
    const modalTitle = document.getElementById('modalTitle');
    const cellSettingsForm = document.getElementById('cellSettingsForm');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const soundNameInput = document.getElementById('soundNameInput');
    const keyBindingInput = document.getElementById('keyBindingInput');
    const loopCheckbox = document.getElementById('loopCheckbox');
    const clearCellButton = document.getElementById('clearCellButton');
    const saveCellSettingsButton = document.getElementById('saveCellSettingsButton');

    // Elementos do Popup de Confirmação (para ESC)
    const stopConfirmationPopup = document.getElementById('stop-confirmation-popup');
    const confirmStopYesBtn = document.getElementById('confirm-stop-yes');
    const confirmStopNoBtn = document.getElementById('confirm-stop-no');

    let currentCellIndex = null; // Usado para saber qual célula está a ser configurada no modal

    // Variáveis para o drag-and-drop
    let draggedOverCell = null;
    let longPressTimer;
    let isLongPress = false;

    // --- Funções de Inicialização e Carregamento ---

    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Cria um nó de ganho mestre e conecta-o ao destino do áudio
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
            // Define o volume inicial a partir do slider
            masterGainNode.gain.value = parseFloat(volumeRange.value);
            audioContext.masterGainNode = masterGainNode; // Anexa para fácil acesso global
        }
    }

    async function loadTranslations() {
        try {
            const response = await fetch('translations.json');
            translations = await response.json();
            console.log('Traduções carregadas:', translations);
        } catch (error) {
            console.error('Erro ao carregar traduções:', error);
            // Fallback para traduções padrão se o ficheiro não carregar
            translations = {
                pt: {
                    title: "Soundboard QWERTY",
                    mainTitle: "Soundboard QWERTY",
                    volumeLabel: "Volume:",
                    fadeInLabel: "Fade In:",
                    fadeOutLabel: "Fade Out:",
                    playMultipleLabel: "Reproduzir Múltiplos",
                    autokillLabel: "Auto-Kill Anterior",
                    loadMultipleSoundsButton: "Carregar Múltiplos Sons",
                    stopAllSoundsButton: "Parar Todos os Sons (ESC)",
                    toggleHelpButton: "Mostrar Ajuda",
                    howToUseTitle: "Como Usar:",
                    dragDropHelp: "Arrastar e Largar: Arraste ficheiros de áudio (MP3, WAV, OGG) para as células para as preencher.",
                    clickHelp: "Clicar: Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.",
                    shortcutsHelp: "Atalhos de Teclado: Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: Q para a primeira célula).",
                    navigationHelp: "Navegação (Modo QLab): Pressione Espaço para tocar o próximo som disponível. Pressione Ctrl + Espaço para tocar o som disponível anterior. Células vazias são ignoradas.",
                    stopAllHelp: "Parar Sons: Pressione ESC para parar todos os sons a tocar.",
                    volumeHelp: "Ajustar Volume: Use o slider de volume ou as teclas ⬆️ e ⬇️ para controlar o volume global.",
                    deleteSoundHelp: "Apagar Som: Clique no ❌ no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga; um clique longo (>0.5s) faz fade out.*",
                    replaceSoundHelp: "Substituir Som: Clique no ⬆️ para carregar um novo som para a célula.",
                    renameHelp: "Mudar Nome: Clique no nome do som para editá-lo.",
                    fadeInHelp: "Controlar Fade In: Use o slider de Fade In, ou as teclas Ctrl + teclas numéricas 0-9 para definir a duração do fade in em segundos.",
                    fadeOutControlHelp: "Controlar Fade Out: Use o slider de Fade Out, ou as teclas numéricas 0-9 para definir a duração do fade out em segundos.",
                    playMultipleModeHelp: "Modo Reproduzir Múltiplos: Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.",
                    autokillModeHelp: "Modo Auto-Kill Anterior: Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.",
                    cueHelp: "CUE / GO: Pressione Ctrl + Enter para 'cue' (marcar) um som. Pressione Enter para tocar todos os sons em 'cue' com fade-in. Pressione Shift + Enter para parar todos os sons em 'cue' com fade-out.",
                    cueSingleHelp: "CUE Individual: Pressione Ctrl + clique na célula para adicionar/remover um som do 'cue'.",
                    removeCueHelp: "Remover CUE: Pressione Alt + Enter para remover todos os sons do 'cue' sem os parar.",
                    confirmStopAll: "Tem certeza que deseja parar todos os sons?",
                    yesButton: "Sim",
                    noButton: "Não",
                    cellEmptyDefault: "Vazio",
                    fileNameLabel: "Nome do Ficheiro:",
                    soundNameLabel: "Nome do Som:",
                    keyBindingLabel: "Atalho de Teclado:",
                    loopLabel: "Loop:",
                    clearCellButton: "Limpar Célula",
                    saveCellSettingsButton: "Guardar",
                    alertNoEmptyCells: "Não há células vazias para adicionar o ficheiro '{fileName}'.",
                    immediateStart: " (Início Imediato)",
                    immediateStop: " (Paragem Imediata)",
                    clearAllCellsButton: "Limpar Todas as Células", // Nova tradução
                    confirmClearAllCells: "Tem certeza que deseja limpar TODAS as células? Esta ação não pode ser desfeita." // Nova tradução
                },
                en: {
                    title: "Soundboard QWERTY",
                    mainTitle: "Soundboard QWERTY",
                    volumeLabel: "Volume:",
                    fadeInLabel: "Fade In:",
                    fadeOutLabel: "Fade Out:",
                    playMultipleLabel: "Play Multiple",
                    autokillLabel: "Auto-Kill Previous",
                    loadMultipleSoundsButton: "Load Multiple Sounds",
                    stopAllSoundsButton: "Stop All Sounds (ESC)",
                    toggleHelpButton: "Show Help",
                    howToUseTitle: "How To Use:",
                    dragDropHelp: "Drag and Drop: Drag audio files (MP3, WAV, OGG) to cells to fill them.",
                    clickHelp: "Click: Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.",
                    shortcutsHelp: "Keyboard Shortcuts: Press the corresponding key on your keyboard to play the sound. (Ex: Q for the first cell).",
                    navigationHelp: "Navigation (QLab Mode): Press Space to play the next available sound. Press Ctrl + Space to play the previous available sound. Empty cells are skipped.",
                    stopAllHelp: "Stop Sounds: Press ESC to stop all playing sounds.",
                    volumeHelp: "Adjust Volume: Use the volume slider or the ⬆️ and ⬇️ keys to control the global volume.",
                    deleteSoundHelp: "Delete Sound: Click the ❌ in the top right corner of a cell to clear it. *A quick click deletes; a long click (>0.5s) fades out.*",
                    replaceSoundHelp: "Replace Sound: Click the ⬆️ to upload a new sound to the cell.",
                    renameHelp: "Rename: Click the sound name to edit it.",
                    fadeInHelp: "Control Fade In: Use the Fade In slider, or Ctrl + number keys 0-9 to set the fade in duration in seconds.",
                    fadeOutControlHelp: "Control Fade Out: Use the Fade Out slider, or number keys 0-9 to set the fade out duration in seconds.",
                    playMultipleModeHelp: "Play Multiple Mode: Allows multiple sounds to play simultaneously if checked.",
                    autokillModeHelp: "Auto-Kill Previous Mode: When a new sound is played, the previously active sound (if any) will be stopped with a quick fade out.",
                    cueHelp: "CUE / GO: Press Ctrl + Enter to 'cue' (mark) a sound. Press Enter to play all cued sounds with fade-in. Press Shift + Enter to stop all cued sounds with fade-out.",
                    cueSingleHelp: "CUE Individual: Press Ctrl + click on the cell to add/remove a sound from the 'cue'.",
                    removeCueHelp: "Remove CUE: Press Alt + Enter to remove all cued sounds without stopping them.",
                    confirmStopAll: "Are you sure you want to stop all sounds?",
                    yesButton: "Yes",
                    noButton: "No",
                    cellEmptyDefault: "Empty",
                    fileNameLabel: "File Name:",
                    soundNameLabel: "Sound Name:",
                    keyBindingLabel: "Key Binding:",
                    loopLabel: "Loop:",
                    clearCellButton: "Clear Cell",
                    saveCellSettingsButton: "Save",
                    alertNoEmptyCells: "No empty cells available to add file '{fileName}'.",
                    immediateStart: " (Immediate Start)",
                    immediateStop: " (Immediate Stop)",
                    clearAllCellsButton: "Clear All Cells", // New translation
                    confirmClearAllCells: "Are you sure you want to clear ALL cells? This action cannot be undone." // New translation
                },
                it: {
                    title: "Soundboard QWERTY",
                    mainTitle: "Soundboard QWERTY",
                    volumeLabel: "Volume:",
                    fadeInLabel: "Fade In:",
                    fadeOutLabel: "Fade Out:",
                    playMultipleLabel: "Riproduci Multipli",
                    autokillLabel: "Auto-Stop Precedente",
                    loadMultipleSoundsButton: "Carica Suoni Multipli",
                    stopAllSoundsButton: "Ferma Tutti i Suoni (ESC)",
                    toggleHelpButton: "Mostra Aiuto",
                    howToUseTitle: "Come Usare:",
                    dragDropHelp: "Trascina e Rilascia: Trascina i file audio (MP3, WAV, OGG) nelle celle per riempirle.",
                    clickHelp: "Clicca: Clicca su una cella vuota per aprire una finestra di selezione file. Clicca su una cella piena per riprodurre il suono.",
                    shortcutsHelp: "Scorciatoie da Tastiera: Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: Q per la prima cella).",
                    navigationHelp: "Navigazione (Modalità QLab): Premi Spazio per riprodurre il suono disponibile successivo. Premi Ctrl + Spazio per riprodurre il suono disponibile precedente. Le celle vuote vengono saltate.",
                    stopAllHelp: "Ferma Suoni: Premi ESC per fermare tutti i suoni in riproduzione.",
                    volumeHelp: "Regola Volume: Usa il cursore del volume o i tasti ⬆️ e ⬇️ per controllare il volume globale.",
                    deleteSoundHelp: "Cancella Suono: Clicca sulla ❌ nell'angolo in alto a destra di una cella per svuotarla. *Un clic rapido cancella; un clic lungo (>0.5s) dissolve.*",
                    replaceSoundHelp: "Sostituisci Suono: Clicca sulla ⬆️ per caricare un nuovo suono nella cella.",
                    renameHelp: "Rinomina: Clicca sul nome del suono per modificarlo.",
                    fadeInHelp: "Controllo Fade In: Usa il cursore Fade In, o i tasti Ctrl + numeri 0-9 per impostare la durata del fade in in secondi.",
                    fadeOutControlHelp: "Controllo Fade Out: Usa il cursore Fade Out, o i tasti numerici 0-9 per impostare la durata del fade out in secondi.",
                    playMultipleModeHelp: "Modalità Riproduci Multipli: Permette a più suoni di essere riprodotti contemporaneamente se la casella è selezionata.",
                    autokillModeHelp: "Modalità Auto-Stop Precedente: Quando viene riprodotto un nuovo suono, il suono precedentemente attivo (se presente) verrà fermato con un rapido fade out.",
                    cueHelp: "CUE / GO: Premi Ctrl + Invio per 'cue' (segnare) un suono. Premi Invio per riprodurre tutti i suoni in 'cue' con fade-in. Premi Shift + Invio per fermare tutti i suoni in 'cue' con fade-out.",
                    cueSingleHelp: "CUE Individuale: Premi Ctrl + clic sulla cella per aggiungere/rimuovere un suono dal 'cue'.",
                    removeCueHelp: "Rimuovi CUE: Premi Alt + Invio per rimuovere tutti i suoni dal 'cue' senza fermarli.",
                    confirmStopAll: "Sei sicuro di voler fermare tutti i suoni?",
                    yesButton: "Sì",
                    noButton: "No",
                    cellEmptyDefault: "Vuoto",
                    fileNameLabel: "Nome File:",
                    soundNameLabel: "Nome Suono:",
                    keyBindingLabel: "Tasto di Scelta Rapida:",
                    loopLabel: "Loop:",
                    clearCellButton: "Cancella Cella",
                    saveCellSettingsButton: "Salva",
                    alertNoEmptyCells: "Nessuna cella vuota disponibile per aggiungere il file '{fileName}'.",
                    immediateStart: " (Avvio Immediato)",
                    immediateStop: " (Arresto Immediato)",
                    clearAllCellsButton: "Cancella Tutte le Celle", // Nuova traduzione
                    confirmClearAllCells: "Sei sicuro di voler cancellare TUTTE le celle? Questa azione non può essere annullata." // Nuova traduzione
                }
            };
        }
    }

    function setLanguage(lang) {
        currentLanguage = lang;
        document.documentElement.lang = lang; // Define o atributo lang no <html>
        // Atualiza todos os elementos com data-key
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.dataset.key;
            if (translations[currentLanguage] && translations[currentLanguage][key]) {
                if (element.tagName === 'INPUT' && element.type === 'submit') {
                    element.value = translations[currentLanguage][key];
                } else if (element.tagName === 'BUTTON' && element.id !== 'toggle-help-button') {
                     element.textContent = translations[currentLanguage][key];
                }
                else {
                    element.textContent = translations[currentLanguage][key];
                }
            }
        });

        // Atualiza os displays de volume e fade para aplicar o texto traduzido
        updateVolumeDisplay();
        updateFadeInDisplay();
        updateFadeOutDisplay();

        // Atualiza os botões de idioma para mostrar qual está ativo
        langButtons.forEach(button => {
            if (button.dataset.lang === lang) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        saveSettings();
    }

    function saveSettings() {
        const settings = {
            soundData: soundData.map(s => s ? {
                fileName: s.fileName,
                name: s.name,
                key: s.key,
                isLooping: s.isLooping,
                isCued: s.isCued // Salva o estado de cue
            } : null),
            volume: volumeRange.value,
            fadeInDuration: fadeInRange.value,
            fadeOutDuration: fadeOutRange.value,
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            language: currentLanguage,
            lastPlayedSoundIndex: lastPlayedSoundIndex // Salva o cursor
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settings));
        console.log('Settings saved', settings);
    }

    async function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings'));
        if (savedSettings) {
            currentLanguage = savedSettings.language || 'pt';
            volumeRange.value = savedSettings.volume || 0.75;
            fadeInRange.value = savedSettings.fadeInDuration || 0;
            fadeOutRange.value = savedSettings.fadeOutDuration || 0;
            playMultipleCheckbox.checked = savedSettings.playMultiple || false;
            autokillModeCheckbox.checked = savedSettings.autokillMode || false;
            lastPlayedSoundIndex = savedSettings.lastPlayedSoundIndex !== undefined ? savedSettings.lastPlayedSoundIndex : null;

            updateVolumeDisplay();
            updateFadeInDisplay();
            updateFadeOutDisplay();

            // Carregar dados dos sons
            for (let i = 0; i < NUM_CELLS; i++) {
                soundData[i] = savedSettings.soundData[i] || null;
                const cell = document.createElement('div');
                cell.classList.add('sound-cell');
                cell.dataset.index = i;

                if (i < 9) {
                    rowTop.appendChild(cell);
                } else if (i < 18) {
                    rowHome.appendChild(cell);
                } else {
                    rowBottom.appendChild(cell);
                }

                if (soundData[i]) {
                    const soundInfo = soundData[i];
                    await loadAudioBuffer(soundInfo.fileName, i);
                    updateCellDisplay(cell, soundInfo, false); // Nao forçar reset
                    if (soundInfo.isCued) {
                        cuedSounds.add(i);
                        cell.classList.add('cued');
                    }
                } else {
                    updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[i] || '', isLooping: false, isCued: false }, true);
                }
                addCellEventListeners(cell, i);
            }

            // Aplicar o volume mestre
            initAudioContext();
            audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);

            console.log('Settings loaded', savedSettings);
        } else {
            // Inicializar células vazias se não houver configurações salvas
            for (let i = 0; i < NUM_CELLS; i++) {
                soundData[i] = null;
                const cell = document.createElement('div');
                cell.classList.add('sound-cell');
                cell.dataset.index = i;

                if (i < 9) {
                    rowTop.appendChild(cell);
                } else if (i < 18) {
                    rowHome.appendChild(cell);
                } else {
                    rowBottom.appendChild(cell);
                }
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[i] || '', isLooping: false, isCued: false }, true);
                addCellEventListeners(cell, i);
            }
            // Definir volume inicial
            initAudioContext();
            audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
            // Salvar as configurações iniciais
            saveSettings();
        }
    }

    function updateCellDisplay(cell, soundInfo, isEmpty) {
        cell.innerHTML = ''; // Limpa o conteúdo atual

        if (isEmpty) {
            cell.classList.remove('filled');
            cell.classList.remove('active');
            cell.classList.remove('cued');
            cell.innerHTML = `
                <div class="key-display">${soundInfo.key.toUpperCase()}</div>
                <div class="sound-name empty">${soundInfo.name}</div>
                <div class="controls">
                    <span class="material-symbols-outlined upload-icon" title="${translations[currentLanguage].replaceSoundHelp}">upload_file</span>
                </div>
            `;
        } else {
            cell.classList.add('filled');
            cell.innerHTML = `
                <div class="key-display">${soundInfo.key ? soundInfo.key.toUpperCase() : ''}</div>
                <div class="sound-name" title="${soundInfo.name}">${soundInfo.name}</div>
                <div class="controls">
                    ${soundInfo.isLooping ? '<span class="material-symbols-outlined loop-icon" title="Looping">loop</span>' : ''}
                    <span class="material-symbols-outlined upload-icon" title="${translations[currentLanguage].replaceSoundHelp}">upload_file</span>
                    <span class="material-symbols-outlined clear-icon" title="${translations[currentLanguage].deleteSoundHelp}">close</span>
                </div>
            `;
            // Se o som estava cued e o display não mostrava, adiciona a classe
            if (soundInfo.isCued) {
                cell.classList.add('cued');
            } else {
                cell.classList.remove('cued');
            }
        }
    }

    async function loadAudioBuffer(url, index) {
        initAudioContext();
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            if (soundData[index]) {
                soundData[index].audioBuffer = audioBuffer;
            } else {
                // Isso deve ser prevenido pela lógica de loadSettings/loadFileIntoCell
                console.warn(`Tentativa de carregar buffer para índice ${index} sem soundData existente.`);
                soundData[index] = {
                    fileName: url,
                    name: url.split('/').pop().split('.')[0], // Nome base do ficheiro
                    key: defaultKeys[index],
                    isLooping: false,
                    audioBuffer: audioBuffer,
                    activePlayingInstances: new Set(),
                    isCued: false
                };
            }
            return true;
        } catch (error) {
            console.error(`Erro ao carregar ou decodificar áudio para a célula ${index}:`, error);
            // Marcar a célula como vazia em caso de erro no carregamento
            soundData[index] = null;
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '', isLooping: false, isCued: false }, true);
            }
            return false;
        }
    }

    async function loadFileIntoCell(file, cell, index, updateOnly = false) {
        initAudioContext();
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const audioBuffer = await audioContext.decodeAudioData(reader.result);
                const soundName = file.name.split('.')[0];
                const key = defaultKeys[index];

                if (!updateOnly) { // Se for um carregamento inicial ou substituição completa
                    soundData[index] = {
                        fileName: file.name, // Não o URL blob, mas o nome original
                        file: file, // Armazena o objeto File para futura persistência/recarregamento
                        name: soundName,
                        key: key,
                        isLooping: false,
                        audioBuffer: audioBuffer,
                        activePlayingInstances: new Set(),
                        isCued: false
                    };
                    updateCellDisplay(cell, soundData[index], false);
                } else { // Se for apenas uma atualização do buffer para um som existente
                    soundData[index].audioBuffer = audioBuffer;
                    soundData[index].fileName = file.name;
                    soundData[index].file = file;
                    soundData[index].name = soundName; // Atualiza o nome também
                    updateCellDisplay(cell, soundData[index], false); // Atualiza o display com o novo nome
                }
                saveSettings();
                console.log(`Som '${soundName}' carregado na célula ${index}.`);

            } catch (e) {
                console.error(`Erro ao decodificar áudio do ficheiro ${file.name}:`, e);
                alert(`Erro ao carregar o ficheiro de áudio '${file.name}'. Verifique se é um formato suportado (MP3, WAV, OGG).`);
                if (!updateOnly) { // Apenas limpa se não for uma atualização falhada
                    clearSoundData(index);
                    updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '', isLooping: false, isCued: false }, true);
                }
            }
        };
        reader.onerror = (e) => {
            console.error('Erro ao ler o ficheiro:', e);
            alert(`Erro ao ler o ficheiro '${file.name}'.`);
        };
        reader.readAsArrayBuffer(file);
    }

    function addCellEventListeners(cell, index) {
        // Drag and Drop
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            cell.classList.add('drag-over');
            draggedOverCell = cell;
        });

        cell.addEventListener('dragleave', (e) => {
            e.stopPropagation();
            cell.classList.remove('drag-over');
            draggedOverCell = null;
        });

        cell.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            cell.classList.remove('drag-over');
            draggedOverCell = null;

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('audio/')) {
                    await loadFileIntoCell(file, cell, index);
                } else {
                    alert('Por favor, arraste um ficheiro de áudio válido.');
                }
            }
        });

        // Click Events
        cell.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Botão esquerdo do rato
                const clearIcon = cell.querySelector('.clear-icon');
                const uploadIcon = cell.querySelector('.upload-icon');
                const soundNameElement = cell.querySelector('.sound-name');

                // Lógica de cue com Ctrl + Click
                if (e.ctrlKey && soundData[index] && soundData[index].audioBuffer) {
                    toggleCue(index);
                    e.preventDefault(); // Previne qualquer comportamento padrão do clique
                    return;
                }

                if (clearIcon && e.target === clearIcon) {
                    isLongPress = false;
                    longPressTimer = setTimeout(() => {
                        isLongPress = true;
                        clearSoundCell(index, 1); // Fade out mais longo
                    }, 500); // 500ms para ser considerado long press
                } else if (uploadIcon && e.target === uploadIcon) {
                    // Abre o diálogo de seleção de ficheiro para substituir
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/*';
                    input.onchange = async (event) => {
                        const file = event.target.files[0];
                        if (file) {
                            await loadFileIntoCell(file, cell, index, true); // updateOnly = true
                        }
                    };
                    input.click();
                } else if (soundNameElement && e.target === soundNameElement && soundData[index]) {
                    // Abre o modal de configurações
                    openCellSettingsModal(index);
                } else {
                    // Comportamento padrão de clique na célula (tocar som ou carregar)
                    if (soundData[index] && soundData[index].audioBuffer) {
                        playSound(index);
                    } else {
                        // Se a célula está vazia, abre o diálogo de seleção de ficheiro
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'audio/*';
                        input.onchange = async (event) => {
                            const file = event.target.files[0];
                            if (file) {
                                await loadFileIntoCell(file, cell, index);
                            }
                        };
                        input.click();
                    }
                }
            }
        });

        cell.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Botão esquerdo do rato
                clearTimeout(longPressTimer);
                const clearIcon = cell.querySelector('.clear-icon');
                if (clearIcon && e.target === clearIcon && !isLongPress) {
                    clearSoundCell(index, 0.1); // Fade out rápido para clique curto
                }
                isLongPress = false; // Reset
            }
        });

        // Previne o menu de contexto padrão no clique com o botão direito
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Implemente aqui a lógica para um menu de contexto personalizado se desejar
            // Por enquanto, apenas o impede de aparecer.
        });
    }

    // --- Funções do Modal de Configurações da Célula ---

    function openCellSettingsModal(index) {
        currentCellIndex = index;
        const sound = soundData[index];

        if (!sound) {
            console.error("No sound data for index:", index);
            return;
        }

        if (modalTitle) modalTitle.textContent = `${translations[currentLanguage].soundNameLabel} - ${sound.name}`; // Pode ajustar
        if (fileNameDisplay) fileNameDisplay.value = sound.fileName || '';
        if (soundNameInput) soundNameInput.value = sound.name;
        if (keyBindingInput) keyBindingInput.value = sound.key;
        if (loopCheckbox) loopCheckbox.checked = sound.isLooping;

        // Atualizar textos dos botões e labels no modal
        document.getElementById('fileNameDisplayLabel').textContent = translations[currentLanguage].fileNameLabel;
        document.getElementById('soundNameLabel').textContent = translations[currentLanguage].soundNameLabel;
        document.getElementById('keyBindingLabel').textContent = translations[currentLanguage].keyBindingLabel;
        document.getElementById('loopLabel').textContent = translations[currentLanguage].loopLabel;
        document.getElementById('clearCellButton').textContent = translations[currentLanguage].clearCellButton;
        document.getElementById('saveCellSettingsButton').textContent = translations[currentLanguage].saveCellSettingsButton;


        // Remove listeners antigos para evitar duplicações
        if (clearCellButton) clearCellButton.onclick = null;
        if (cellSettingsForm) cellSettingsForm.onsubmit = null;

        // Adiciona listeners para as ações do modal
        if (clearCellButton) {
            clearCellButton.onclick = () => {
                clearSoundCell(index, 0.1);
                closeCellSettingsModal();
            };
        }
        if (cellSettingsForm) {
            cellSettingsForm.onsubmit = (e) => {
                e.preventDefault();
                saveCellSettings(index);
            };
        }

        if (cellSettingsModal) cellSettingsModal.style.display = 'block';
    }

    function closeCellSettingsModal() {
        if (cellSettingsModal) cellSettingsModal.style.display = 'none';
        currentCellIndex = null;
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeCellSettingsModal);
    }

    // Fecha o modal se clicar fora dele
    window.addEventListener('click', (event) => {
        if (event.target === cellSettingsModal) {
            closeCellSettingsModal();
        }
    });

    function saveCellSettings(index) {
        const sound = soundData[index];
        if (sound) {
            const newName = soundNameInput.value.trim();
            const newKey = keyBindingInput.value.trim().toLowerCase();
            const newLooping = loopCheckbox.checked;

            // Validar e atualizar a tecla
            if (newKey && newKey !== sound.key) {
                // Verificar se a nova tecla já está em uso por outra célula
                const existingIndex = defaultKeys.indexOf(newKey);
                const isKeyAlreadyUsed = soundData.some((s, i) => s && s.key === newKey && i !== index);

                if (isKeyAlreadyUsed) {
                    alert(`A tecla '${newKey.toUpperCase()}' já está em uso. Por favor, escolha outra.`);
                    keyBindingInput.value = sound.key; // Reverte para a tecla antiga
                    return;
                }
                sound.key = newKey;
                // Atualiza a key nos defaultKeys para manter o mapeamento consistente, se necessário,
                // ou apenas atualiza a propriedade 'key' do objeto soundData.
                // Se 'defaultKeys' for apenas um mapeamento inicial, não precisa de ser alterado.
                // Para este caso, vamos só atualizar a propriedade 'key' do objeto soundData.
            } else if (!newKey) {
                 alert("O atalho de teclado não pode ser vazio.");
                 keyBindingInput.value = sound.key; // Reverte para a tecla antiga
                 return;
            }

            sound.name = newName;
            sound.isLooping = newLooping;

            // Atualizar o display da célula no grid
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                updateCellDisplay(cell, sound, false);
            }

            saveSettings();
            closeCellSettingsModal();
        }
    }

    // --- Funções de Reprodução de Áudio ---

    function playSound(index) {
        const sound = soundData[index];
        const currentFadeInDuration = parseFloat(fadeInRange.value);

        if (!sound || !sound.audioBuffer) {
            console.log(`Célula ${index} está vazia.`);
            lastPlayedSoundIndex = index; // Move o cursor mesmo se estiver vazio, para o próximo GO
            return false; // Nenhum som para tocar
        }

        // Se o som já está a tocar e não estamos no modo de reproduzir múltiplos, paramos as instâncias atuais
        if (!playMultipleCheckbox.checked && sound.activePlayingInstances.size > 0) {
            sound.activePlayingInstances.forEach(instance => {
                fadeoutInstance(instance.source, instance.gain, 0.1); // Fade out rápido
            });
            sound.activePlayingInstances.clear();
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
                if (sourceNode.numberOfOutputs > 0) { // Verifica se ainda está conectado
                    sourceNode.disconnect();
                    gainNode.disconnect();
                }
            }, duration * 1000 + 100); // Garante que a desconexão ocorre após o fade
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
        soundData[index] = null; // Remove a referência ao som
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
            fadeoutSound(index, parseFloat(fadeOutRange.value)); // Usa a duração global de fadeOut
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

    // Função auxiliar para encontrar a próxima/anterior célula com som
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

            if (startIndex !== null && currentIndex === startIndex && attempts > 0) {
                return null;
            }

            attempts++;
        }
        return null;
    }

    // --- Funções de Controlo Global ---

    function stopAllSounds() {
        // Mostra o pop-up de confirmação
        if (stopConfirmationPopup) {
            stopConfirmationPopup.style.display = 'flex'; // ou 'block', dependendo do seu CSS
        }
    }

    // Event listeners para o pop-up de confirmação
    if (confirmStopYesBtn) {
        confirmStopYesBtn.addEventListener('click', () => {
            if (audioContext) {
                const now = audioContext.currentTime;
                const fadeDuration = 0.2; // Fade out rápido para stop geral

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
            if (stopConfirmationPopup) {
                stopConfirmationPopup.style.display = 'none'; // Esconde o pop-up
            }
        });
    }

    if (confirmStopNoBtn) {
        confirmStopNoBtn.addEventListener('click', () => {
            if (stopConfirmationPopup) {
                stopConfirmationPopup.style.display = 'none'; // Esconde o pop-up
            }
        });
    }

    // --- NOVO CÓDIGO ---

    /**
     * Limpa todas as células do soundboard, parando quaisquer sons ativos,
     * redefinindo os dados e o display das células, e removendo cues.
     */
    function clearAllSoundCells() {
        // Exibe um pop-up de confirmação para o utilizador
        if (!confirm(translations[currentLanguage].confirmClearAllCells)) {
            return; // Se o utilizador cancelar, a função termina aqui
        }

        // Primeiro, para todos os sons que possam estar a ser reproduzidos
        // Não mostra o pop-up de stop individualmente aqui
        if (audioContext) {
            const now = audioContext.currentTime;
            const fadeDuration = 0.2; // Fade out rápido ao limpar tudo

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
                        console.warn("Erro ao parar som ou aplicar fade-out durante clearAll:", error);
                        if (instance.source && typeof instance.source.stop === 'function') {
                            instance.source.stop();
                        }
                    }
                }
                globalActivePlayingInstances.delete(instance);
            });
            globalActivePlayingInstances.clear();
        }

        // Itera sobre todas as células e limpa os seus dados e display
        for (let i = 0; i < NUM_CELLS; i++) {
            clearSoundData(i); // Chama a função existente para limpar os dados de um som específico
            const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
            if (cell) {
                // Atualiza a aparência da célula para o estado padrão "vazio"
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[i] || '', isLooping: false, isCued: false }, true);
                cell.classList.remove('active'); // Remove a classe 'active' se presente
                cell.classList.remove('cued');   // Remove a classe 'cued' se presente
            }
        }
        cuedSounds.clear(); // Limpa a lista de sons em cue
        lastPlayedSoundIndex = null; // Reseta o cursor do último som reproduzido
        saveSettings(); // Salva o estado atual (vazio) no localStorage
        console.log("Todas as células foram limpas e as configurações salvas.");
    }

    // Obtém a referência para o novo botão "Limpar Todas as Células"
    const clearAllCellsButton = document.getElementById('clear-all-cells'); // ID atualizado para 'clear-all-cells'
    if (clearAllCellsButton) {
        // Adiciona um event listener para o clique do botão
        clearAllCellsButton.addEventListener('click', clearAllSoundCells);
    } else {
        // Alerta no console se o botão não for encontrado (útil para depuração)
        console.warn("Elemento com ID 'clear-all-cells' não encontrado. O botão 'Limpar Todas as Células' não funcionará.");
    }

    // --- FIM DO NOVO CÓDIGO ---


    // --- Event Listeners Globais ---

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
        } else if (pressedKey === ' ' && e.ctrlKey) { // Ctrl + Space (GO-)
            e.preventDefault();
            let targetIndex;

            if (lastPlayedSoundIndex === null) {
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
            } else { // Enter (sem modificadores): Toca todos os sons em cue
                playCuedSounds();
            }
            return;
        }

        if (pressedKey === 'arrowup') {
            e.preventDefault();
            volumeRange.value = Math.min(1, parseFloat(volumeRange.value) + 0.05);
            updateVolumeDisplay();
            if (audioContext && audioContext.masterGainNode) {
                audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
            }
            saveSettings();
        } else if (pressedKey === 'arrowdown') {
            e.preventDefault();
            volumeRange.value = Math.max(0, parseFloat(volumeRange.value) - 0.05);
            updateVolumeDisplay();
            if (audioContext && audioContext.masterGainNode) {
                audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
            }
            saveSettings();
        } else if (pressedKey === 'escape') {
            stopAllSounds(); // Chamar a função que exibe o pop-up
        } else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault();
            fadeInRange.value = parseInt(pressedKey);
            updateFadeInDisplay();
            saveSettings();
        } else if (pressedKey >= '0' && pressedKey <= '9' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            fadeOutRange.value = parseInt(pressedKey);
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
        updateFadeInDisplay();
        saveSettings();
    });

    fadeOutRange.addEventListener('input', () => {
        updateFadeOutDisplay();
        saveSettings();
    });

    volumeRange.addEventListener('input', () => {
        updateVolumeDisplay();
        if (audioContext && audioContext.masterGainNode) {
            audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
        }
        saveSettings();
    });

    function updateVolumeDisplay() {
        volumeDisplay.textContent = `${Math.round(volumeRange.value * 100)}%`;
    }

    function updateFadeInDisplay() {
        const currentFadeInDuration = parseFloat(fadeInRange.value);
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
        const currentFadeOutDuration = parseFloat(fadeOutRange.value);
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

    // Event listener para o botão "Parar Todos os Sons" (que agora mostra o pop-up)
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

    // Início da ajuda (toggleMenu.js) - assumindo que este ficheiro lida com isto
    const toggleHelpButton = document.getElementById('toggle-help-button');
    const helpTextContent = document.getElementById('help-text-content');

    if (toggleHelpButton && helpTextContent) {
        toggleHelpButton.addEventListener('click', () => {
            helpTextContent.classList.toggle('active');
            if (helpTextContent.classList.contains('active')) {
                toggleHelpButton.textContent = translations[currentLanguage].toggleHelpButtonHide || "Esconder Ajuda";
            } else {
                toggleHelpButton.textContent = translations[currentLanguage].toggleHelpButton || "Mostrar Ajuda";
            }
        });
    }
    // Fim da ajuda

    loadTranslations().then(() => {
        loadSettings();
        setLanguage(currentLanguage); // Garante que a linguagem correta é aplicada após carregar as settings
    });


    // Resumir AudioContext no primeiro clique do utilizador
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true }); // Executa apenas uma vez
});
