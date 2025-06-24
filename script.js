// script.js

// --- Variáveis Globais ---
let audioContext;
let masterGainNode; // Nó de ganho mestre para controlo global de volume
const soundData = []; // Armazena os dados de cada som (nome, caminho, etc.)
const soundBoardSize = 25; // Por exemplo, 25 células (5x5, 2x12 ou 3x10-10-5)
const defaultKeys = [
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
    'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
    'z', 'x', 'c', 'v', 'b', 'n', 'm' // Mapeamento para 25 teclas
];

const globalActivePlayingInstances = new Set(); // Armazena todas as instâncias de áudio ativas
let lastPlayedSoundIndex = null; // Para a funcionalidade Auto-Kill Anterior

let currentFadeInDuration = 0; // Duração do fade-in em segundos
let currentFadeOutDuration = 0; // Duração do fade-out em segundos

let currentLanguage = 'pt'; // Idioma padrão

// Variáveis de controlo dos checboxes
let isReproduceMultiplos = false;
let isAutoKillAnterior = false;

// Variáveis para navegação de faixas
let currentTrackIndex = -1; // -1 significa que nenhuma faixa foi tocada ainda ou está na "faixa zero"


// --- Traduções (NOVO) ---
const translations = {
    pt: {
        title: "Soundboard QWERTY",
        volume: "Volume",
        reproduceMultiplos: "Reproduzir Múltiplos",
        autoKillAnterior: "Auto-Kill Anterior",
        loadMultipleSounds: "Carregar Múltiplos Sons",
        stopAllSounds: "Parar Todos os Sons (ESC)",
        fadeIn: "Fade In",
        fadeOut: "Fade Out",
        immediate: "(Paragem Imediata)",
        cellEmptyDefault: "Vazio",
        howToUseTitle: "Como Usar",
        howToUseDragDrop: "Arrastar e Largar:",
        howToUseDragDropDesc: "Arraste ficheiros de áudio (MP3, WAV, OGG) para as células para as preencher.",
        howToUseClick: "Clicar:",
        howToUseClickDesc: "Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.",
        howToUseKeyboard: "Atalhos de Teclado:",
        howToUseKeyboardDesc: "Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: <kbd>Q</kbd> para a primeira célula).",
        howToUseStopAll: "Parar Sons:",
        howToUseStopAllDesc: "Pressione <kbd>ESC</kbd> para parar todos os sons a tocar.",
        howToUseAdjustVolume: "Ajustar Volume:",
        howToUseAdjustVolumeDesc: "Use o slider de volume ou as teclas <kbd>↑</kbd> e <kbd>↓</kbd> para controlar o volume global.",
        howToUseDelete: "Apagar Som:",
        howToUseDeleteDesc: "Clique no <kbd>X</kbd> no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga, um clique longo (>0.5s) faz fade out.*",
        howToUseReplace: "Substituir Som:",
        howToUseReplaceDesc: "Clique no <kbd>file_upload</kbd> para carregar um novo som para a célula.",
        howToUseRename: "Mudar Nome:",
        howToUseRenameDesc: "Clique no nome do som para editá-lo.",
        howToUseFadeIn: "Controlar Fade In:",
        howToUseFadeInDesc: "Pressione <kbd>Ctrl</kbd> + teclas numéricas <kbd>0-9</kbd> para definir a duração do fade in em segundos. (<kbd>0</kbd> = Paragem Imediata).",
        howToUseFadeOut: "Controlar Fade Out:",
        howToUseFadeOutDesc: "Pressione as teclas numéricas <kbd>Alt</kbd> + <kbd>0-9</kbd> para definir a duração do fade out em segundos. (<kbd>0</kbd> = Paragem Imediata).",
        howToUseReproduceMultiplos: "Modo Reproduzir Múltiplos:",
        howToUseReproduceMultiplosDesc: "Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.",
        howToUseAutoKill: "Modo Auto-Kill Anterior:",
        howToUseAutoKillDesc: "Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.",
        loopButtonTitle: "Loop (Alternar)", // Tooltip para o botão de loop
        goNextTrack: "GO (Avançar Faixa):", // NOVO
        goNextTrackDesc: "Pressione <kbd>Space</kbd> para tocar a próxima faixa preenchida na ordem do Soundboard.", // NOVO
        goPrevTrack: "GO- (Voltar Faixa):", // NOVO
        goPrevTrackDesc: "Pressione <kbd>Ctrl</kbd> + <kbd>Space</kbd> para tocar a faixa preenchida anterior na ordem do Soundboard.", // NOVO
        cueListMode: "Modo \"Cue List\":", // NOVO
        cueListModeDesc: "Para usar as funções GO/GO- como uma lista de reprodução sequencial, mantenha a caixa <strong>\"Auto-Kill Anterior\"</strong> selecionada. Isso garantirá que o som anterior pare quando o próximo for acionado." // NOVO

    },
    en: {
        title: "QWERTY Soundboard",
        volume: "Volume",
        reproduceMultiplos: "Play Multiple",
        autoKillAnterior: "Auto-Kill Previous",
        loadMultipleSounds: "Load Multiple Sounds",
        stopAllSounds: "Stop All Sounds (ESC)",
        fadeIn: "Fade In",
        fadeOut: "Fade Out",
        immediate: "(Immediate Stop)",
        cellEmptyDefault: "Empty",
        howToUseTitle: "How To Use",
        howToUseDragDrop: "Drag and Drop:",
        howToUseDragDropDesc: "Drag audio files (MP3, WAV, OGG) to cells to fill them.",
        howToUseClick: "Click:",
        howToUseClickDesc: "Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.",
        howToUseKeyboard: "Keyboard Shortcuts:",
        howToUseKeyboardDesc: "Press the corresponding key on your keyboard to play the sound. (Ex: <kbd>Q</kbd> for the first cell).",
        howToUseStopAll: "Stop Sounds:",
        howToUseStopAllDesc: "Press <kbd>ESC</kbd> to stop all playing sounds.",
        howToUseAdjustVolume: "Adjust Volume:",
        howToUseAdjustVolumeDesc: "Use the volume slider or the <kbd>↑</kbd> and <kbd>↓</kbd> keys to control global volume.",
        howToUseDelete: "Delete Sound:",
        howToUseDeleteDesc: "Click the <kbd>X</kbd> in the top right corner of a cell to empty it. *A quick click deletes, a long click (>0.5s) fades out.*",
        howToUseReplace: "Replace Sound:",
        howToUseReplaceDesc: "Click the <kbd>file_upload</kbd> to load a new sound for the cell.",
        howToUseRename: "Rename:",
        howToUseRenameDesc: "Click the sound name to edit it.",
        howToUseFadeIn: "Control Fade In:",
        howToUseFadeInDesc: "Press <kbd>Ctrl</kbd> + number keys <kbd>0-9</kbd> to set fade in duration in seconds. (<kbd>0</kbd> = Immediate).",
        howToUseFadeOut: "Control Fade Out:",
        howToUseFadeOutDesc: "Press <kbd>Alt</kbd> + number keys <kbd>0-9</kbd> to set fade out duration in seconds. (<kbd>0</kbd> = Immediate).",
        howToUseReproduceMultiplos: "Multiple Playback Mode:",
        howToUseReproduceMultiplosDesc: "Allows multiple sounds to play at the same time if the box is checked.",
        howToUseAutoKill: "Auto-Kill Previous Mode:",
        howToUseAutoKillDesc: "When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.",
        loopButtonTitle: "Loop (Toggle)",
        goNextTrack: "GO (Next Track):", // NOVO
        goNextTrackDesc: "Press <kbd>Space</kbd> to play the next filled track in the Soundboard order.", // NOVO
        goPrevTrack: "GO- (Previous Track):", // NOVO
        goPrevTrackDesc: "Press <kbd>Ctrl</kbd> + <kbd>Space</kbd> to play the previous filled track in the Soundboard order.", // NOVO
        cueListMode: "Cue List Mode:", // NOVO
        cueListModeDesc: "To use the GO/GO- functions as a sequential playback list, keep the <strong>\"Auto-Kill Previous\"</strong> checkbox selected. This will ensure the previous sound stops when the next one is triggered." // NOVO

    },
    it: {
        title: "Soundboard QWERTY",
        volume: "Volume",
        reproduceMultiplos: "Riproduci Multipli",
        autoKillAnterior: "Auto-Stop Precedente",
        loadMultipleSounds: "Carica Più Suoni",
        stopAllSounds: "Ferma Tutti i Suoni (ESC)",
        fadeIn: "Fade In",
        fadeOut: "Fade Out",
        immediate: "(Stop Immediato)",
        cellEmptyDefault: "Vuoto",
        howToUseTitle: "Come Usare",
        howToUseDragDrop: "Trascina e Rilascia:",
        howToUseDragDropDesc: "Trascina i file audio (MP3, WAV, OGG) nelle celle per riempirle.",
        howToUseClick: "Clicca:",
        howToUseClickDesc: "Clicca una cella vuota per aprire una finestra di selezione file. Clicca una cella piena per riprodurre il suono.",
        howToUseKeyboard: "Scorciatoie da Tastiera:",
        howToUseKeyboardDesc: "Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: <kbd>Q</kbd> per la prima cella).",
        howToUseStopAll: "Ferma Suoni:",
        howToUseStopAllDesc: "Premi <kbd>ESC</kbd> per fermare tutti i suoni in riproduzione.",
        howToUseAdjustVolume: "Regola Volume:",
        howToUseAdjustVolumeDesc: "Usa il cursore del volume o i tasti <kbd>↑</kbd> e <kbd>↓</kbd> per controllare il volume globale.",
        howToUseDelete: "Elimina Suono:",
        howToUseDeleteDesc: "Clicca la <kbd>X</kbd> nell'angolo in alto a destra di una cella per svuotarla. *Un clic rapido elimina, un clic lungo (>0.5s) fa il fade out.*",
        howToUseReplace: "Sostituisci Suono:",
        howToUseReplaceDesc: "Clicca <kbd>file_upload</kbd> per caricare un nuovo suono per la cella.",
        howToUseRename: "Rinomina:",
        howToUseRenameDesc: "Clicca sul nome del suono per modificarlo.",
        howToUseFadeIn: "Controlla Fade In:",
        howToUseFadeInDesc: "Premi <kbd>Ctrl</kbd> + tasti numerici <kbd>0-9</kbd> per impostare la durata del fade in in secondi. (<kbd>0</kbd> = Immediato).",
        howToUseFadeOut: "Controlla Fade Out:",
        howToUseFadeOutDesc: "Premi <kbd>Alt</kbd> + tasti numerici <kbd>0-9</kbd> per impostare la durata del fade out in secondi. (<kbd>0</kbd> = Immediato).",
        howToUseReproduceMultiplos: "Modalità Riproduzione Multipla:",
        howToUseReproduceMultiplosDesc: "Consente la riproduzione simultanea di più suoni se la casella è selezionata.",
        howToUseAutoKill: "Modalità Auto-Stop Precedente:",
        howToUseAutoKillDesc: "Alla riproduzione di un nuovo suono, il suono precedentemente attivo (se presente) verrà fermato con un rapido fade out.",
        loopButtonTitle: "Loop (Attiva/Disattiva)",
        goNextTrack: "GO (Traccia Successiva):", // NOVO
        goNextTrackDesc: "Premi <kbd>Space</kbd> per riprodurre la prossima traccia riempita nell'ordine del Soundboard.", // NOVO
        goPrevTrack: "GO- (Traccia Precedente):", // NOVO
        goPrevTrackDesc: "Premi <kbd>Ctrl</kbd> + <kbd>Space</kbd> per riprodurre la traccia riempita precedente nell'ordine del Soundboard.", // NOVO
        cueListMode: "Modalità \"Cue List\":", // NOVO
        cueListModeDesc: "Per usare le funzioni GO/GO- come una lista di riproduzione sequenziale, mantieni selezionata la casella <strong>\"Auto-Stop Precedente\"</strong>. Questo garantirà che il suono precedente si fermi quando viene attivato il successivo." // NOVO
    }
};


// --- Funções de Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    initializeAudioContext();
    loadSettings(); // Carrega configurações salvas (volume, fades, etc.)
    setupSoundBoard();
    setupGlobalControls();
    setupLanguageSelector();
    setLanguage(currentLanguage); // Define o idioma inicial
    setupDragAndDropGlobal(); // Configura drag & drop global
    setupKeyboardShortcuts(); // Configura atalhos de teclado
});

function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Cria um nó de ganho mestre para controlo global de volume
        masterGainNode = audioContext.createGain();
        masterGainNode.connect(audioContext.destination);
        // Define o volume inicial com base no slider carregado
        const volumeRange = document.getElementById('volume-range');
        masterGainNode.gain.value = parseFloat(volumeRange.value);
    }
}

function setupSoundBoard() {
    const soundBoard = document.getElementById('sound-board');
    // Adiciona as linhas do soundboard
    const rows = [
        { id: 'row-top', keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] },
        { id: 'row-home', keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] },
        { id: 'row-bottom', keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm'] }
    ];

    let cellIndexCounter = 0; // Para garantir que os índices são contínuos de 0 a 24

    rows.forEach(rowData => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('row');
        rowDiv.id = rowData.id;

        rowData.keys.forEach(keyChar => {
            const cell = document.createElement('div');
            cell.classList.add('sound-cell');
            cell.dataset.key = keyChar; // Armazena a tecla associada
            cell.dataset.index = cellIndexCounter; // Armazena o índice numérico
            soundData[cellIndexCounter] = {
                name: translations[currentLanguage].cellEmptyDefault,
                path: null,
                type: 'empty',
                buffer: null,
                isLooping: false,
                color: '#444',
                activePlayingInstances: new Set() // Conjunto de instâncias para este som
            };
            createCellElements(cell, cellIndexCounter);
            rowDiv.appendChild(cell);
            cellIndexCounter++;
        });
        soundBoard.appendChild(rowDiv);
    });

    // Inicializa as células com base nos dados
    for (let i = 0; i < soundBoardSize; i++) {
        const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
        updateCellDisplay(cell, soundData[i], true); // Inicia todas como vazias
        setupCellEvents(cell, i); // Configura eventos para cada célula
    }

    loadSoundDataFromLocalStorage(); // Tenta carregar dados guardados
}

function createCellElements(cell, index) {
    // Sound Name Display
    const nameDisplay = document.createElement('div');
    nameDisplay.classList.add('sound-name');
    nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
    nameDisplay.contentEditable = false;
    nameDisplay.title = translations[currentLanguage].renameHelp; // Adiciona tooltip
    cell.appendChild(nameDisplay);

    // Key Display (Bottom Right)
    const keyDisplayBottom = document.createElement('div');
    keyDisplayBottom.classList.add('key-display-bottom');
    keyDisplayBottom.textContent = defaultKeys[index] ? defaultKeys[index].toUpperCase() : '';
    cell.appendChild(keyDisplayBottom);

    // Delete Button (Top Right)
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-button');
    deleteButton.innerHTML = '<span class="material-symbols-outlined">close</span>';
    deleteButton.title = translations[currentLanguage].deleteSoundHelp; // Tooltip
    deleteButton.style.display = 'none'; // Hidden initially
    cell.appendChild(deleteButton);

    // Replace Sound Button (Top Left)
    const replaceButton = document.createElement('button');
    replaceButton.classList.add('replace-sound-button');
    replaceButton.innerHTML = '<span class="material-symbols-outlined">file_upload</span>';
    replaceButton.title = translations[currentLanguage].replaceSoundHelp; // Tooltip
    replaceButton.style.display = 'none'; // Hidden initially
    cell.appendChild(replaceButton);

    // Loop Button (Bottom Left)
    const loopButton = document.createElement('button');
    loopButton.classList.add('loop-button');
    loopButton.innerHTML = '<span class="material-symbols-outlined">loop</span>';
    loopButton.title = translations[currentLanguage].loopButtonTitle; // Tooltip
    loopButton.style.display = 'none'; // Hidden initially
    cell.appendChild(loopButton);
}


function setupCellEvents(cell, index) {
    const nameDisplay = cell.querySelector('.sound-name');
    const deleteButton = cell.querySelector('.delete-button');
    const replaceButton = cell.querySelector('.replace-sound-button');
    const loopButton = cell.querySelector('.loop-button');

    // Evento de clique na célula (para tocar som ou abrir ficheiro)
    cell.addEventListener('click', (e) => {
        // Ignorar clique se clicou num dos botões específicos ou no nome (para edição)
        if (e.target === deleteButton || deleteButton.contains(e.target) ||
            e.target === replaceButton || replaceButton.contains(e.target) ||
            e.target === loopButton || loopButton.contains(e.target) ||
            e.target === nameDisplay || nameDisplay.contains(e.target)) {
            return;
        }

        if (soundData[index].type === 'empty') {
            openFileSelector(index);
        } else {
            playSound(index);
        }
    });

    // Evento de duplo clique para editar nome
    nameDisplay.addEventListener('dblclick', () => {
        if (soundData[index].type !== 'empty') {
            nameDisplay.contentEditable = true;
            nameDisplay.focus();
        }
    });

    // Evento para guardar nome ao perder o foco ou pressionar Enter
    nameDisplay.addEventListener('blur', () => {
        nameDisplay.contentEditable = false;
        soundData[index].name = nameDisplay.textContent.trim();
        saveSoundData();
        updateCellDisplay(cell, soundData[index], false); // Atualiza para aplicar estilos de ellipsis se necessário
    });

    nameDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Impede nova linha
            nameDisplay.blur(); // Perde o foco para salvar
        }
    });

    // Eventos para arrastar e largar
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
        if (file && file.type.startsWith('audio/')) {
            loadSoundIntoCell(file, index);
        } else {
            alert(translations[currentLanguage].howToUseDragDropDesc); // Ajustar esta mensagem
        }
    });

    // Eventos para o botão de apagar
    let deleteTimer;
    deleteButton.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // Previne que o clique chegue à célula
        deleteTimer = setTimeout(() => {
            // Long click: fade out sound
            if (soundData[index].activePlayingInstances.size > 0) {
                stopSpecificSoundWithFade(index, 0.5); // Fade out em 0.5s
            } else {
                // Se não estiver a tocar, apaga imediatamente
                deleteSoundFromCell(index);
            }
            clearTimeout(deleteTimer); // Clear the timer to prevent quick click from triggering
        }, 500); // 500ms para um "long click"
    });

    deleteButton.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        if (deleteTimer) {
            clearTimeout(deleteTimer);
            deleteTimer = null;
            // Quick click: delete sound immediately if it wasn't a long click
            if (soundData[index].activePlayingInstances.size === 0) {
                 deleteSoundFromCell(index);
            }
        }
    });

    deleteButton.addEventListener('mouseleave', () => {
        if (deleteTimer) {
            clearTimeout(deleteTimer);
            deleteTimer = null;
        }
    });

    // Evento para o botão de substituir som
    replaceButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Previne que o clique chegue à célula
        openFileSelector(index);
    });

    // Evento para o botão de loop
    loopButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Previne que o clique chegue à célula
        if (soundData[index].type !== 'empty') {
            soundData[index].isLooping = !soundData[index].isLooping;
            loopButton.classList.toggle('active', soundData[index].isLooping); // Atualiza a classe visual
            saveSoundData();
            // Se o som estiver a tocar e o loop for desativado, ele deve parar no final da reprodução
            // Se estiver a tocar e o loop for ativado, ele continuará a fazer loop
        }
    });
}

function updateCellDisplay(cell, data, isEmpty) {
    const nameDisplay = cell.querySelector('.sound-name');
    const keyDisplayBottom = cell.querySelector('.key-display-bottom');
    const deleteButton = cell.querySelector('.delete-button');
    const replaceButton = cell.querySelector('.replace-sound-button');
    const loopButton = cell.querySelector('.loop-button'); // Obter o botão de loop

    if (isEmpty) {
        cell.classList.add('empty');
        nameDisplay.textContent = translations[currentLanguage].cellEmptyDefault;
        nameDisplay.contentEditable = false;
        deleteButton.style.display = 'none';
        replaceButton.style.display = 'none';
        loopButton.style.display = 'none'; // Esconde o botão de loop
        cell.style.backgroundColor = 'transparent';
        loopButton.classList.remove('active'); // Garante que a classe 'active' é removida quando vazia
    } else {
        cell.classList.remove('empty');
        nameDisplay.textContent = data.name || translations[currentLanguage].cellNoName;
        nameDisplay.contentEditable = true;
        deleteButton.style.display = 'flex';
        replaceButton.style.display = 'flex';
        loopButton.style.display = 'flex'; // Mostra o botão de loop
        cell.style.backgroundColor = data.color;
        // Define o estado visual do botão de loop com base nos dados
        loopButton.classList.toggle('active', data.isLooping);
    }
    keyDisplayBottom.textContent = defaultKeys[cell.dataset.index] ? defaultKeys[cell.dataset.index].toUpperCase() : '';
}

// --- Funções de Carregamento de Som ---
function openFileSelector(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            loadSoundIntoCell(file, index);
        }
    };
    input.click();
}

function loadSoundIntoCell(file, index) {
    if (!audioContext) initializeAudioContext();

    const reader = new FileReader();
    reader.onload = (e) => {
        audioContext.decodeAudioData(e.target.result)
            .then(buffer => {
                const color = getRandomColor(); // Assume que você tem uma função getRandomColor
                soundData[index] = {
                    name: file.name.split('.')[0], // Nome do ficheiro sem extensão
                    path: null, // Não salvamos o path do ficheiro local
                    type: 'file',
                    buffer: buffer,
                    isLooping: false, // Por padrão, não faz loop
                    color: color,
                    activePlayingInstances: new Set()
                };
                saveSoundData(); // Guarda o novo som
                const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                updateCellDisplay(cell, soundData[index], false); // Atualiza o display da célula
            })
            .catch(e => console.error("Erro ao descodificar áudio:", e));
    };
    reader.readAsArrayBuffer(file);
}

// Função utilitária para gerar cores aleatórias (implementação simplificada)
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// --- Funções de Reprodução de Som ---
function playSound(index, fromTrackNavigation = false) { // Adicione este novo parâmetro
    if (!audioContext) initializeAudioContext(); // Garante que o contexto de áudio está pronto

    const data = soundData[index];
    if (data.type === 'empty' || !data.buffer) {
        console.warn('Célula vazia ou buffer não carregado:', index);
        return;
    }

    // Se "Auto-Kill Anterior" estiver ativo e um som anterior foi tocado
    if (isAutoKillAnterior && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
        stopSpecificSoundWithFade(lastPlayedSoundIndex, currentFadeOutDuration);
    }

    // Se "Reproduzir Múltiplos" não estiver ativo e este som já estiver a tocar
    if (!isReproduceMultiplos && data.activePlayingInstances.size > 0) {
        stopSpecificSoundWithFade(index, currentFadeOutDuration); // Parar a instância existente com fade
        return; // E não reproduzir novamente
    }

    const source = audioContext.createBufferSource();
    source.buffer = data.buffer;

    const gainNode = audioContext.createGain(); // Nó de ganho individual para este som

    // Aplica Fade In
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now); // Começa em volume 0
    if (currentFadeInDuration > 0) {
        gainNode.gain.linearRampToValueAtTime(1, now + currentFadeInDuration);
    } else {
        gainNode.gain.setValueAtTime(1, now); // Imediato
    }

    source.connect(gainNode);
    gainNode.connect(masterGainNode); // Conecta ao nó de ganho mestre

    source.loop = data.isLooping; // Define o loop

    // Adiciona o som ativo ao Set de instâncias para controlo
    const instance = { source, gainNode, cellIndex: index }; // Inclui cellIndex para referência
    data.activePlayingInstances.add(instance);
    globalActivePlayingInstances.add(instance);

    source.start(0); // Inicia imediatamente

    // Adiciona a classe 'active' à célula
    const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
    if (cell) {
        cell.classList.add('active');
    }

    // Remove a instância quando o som termina (se não estiver em loop)
    source.onended = () => {
        if (!source.loop) { // Só remove se não estiver em loop (loopers são geridos de outra forma)
            data.activePlayingInstances.delete(instance);
            globalActivePlayingInstances.delete(instance);
            if (cell && data.activePlayingInstances.size === 0) {
                cell.classList.remove('active'); // Remove a classe 'active' quando não há instâncias a tocar
            }
            // Desconectar os nós para libertar recursos
            source.disconnect();
            gainNode.disconnect();
        }
    };

    lastPlayedSoundIndex = index; // Atualiza o último som tocado

    // NOVO: Atualiza o currentTrackIndex apenas se a chamada vier da navegação de faixas
    if (fromTrackNavigation) {
        currentTrackIndex = index;
        // Opcional: Remover a classe 'active' da célula anterior, se houver
        document.querySelectorAll('.sound-cell.active').forEach(cell => {
            if (parseInt(cell.dataset.index) !== index) {
                cell.classList.remove('active');
            }
        });
        // Adicionar a classe 'active' à célula atual
        document.querySelector(`.sound-cell[data-index="${index}"]`).classList.add('active');
    } else if (currentTrackIndex === -1 && soundData[index].type === 'file') {
        // Se for o primeiro som tocado por clique/tecla normal, define-o como a primeira faixa
        currentTrackIndex = index;
    }
}


function stopSpecificSoundWithFade(index, duration) {
    const data = soundData[index];
    if (!data || data.activePlayingInstances.size === 0) return;

    const now = audioContext.currentTime;

    // Converte para Set para permitir remoção durante a iteração
    const instancesToStop = new Set(data.activePlayingInstances);

    instancesToStop.forEach(instance => {
        if (instance && instance.gain && instance.source) {
            try {
                instance.gain.gain.cancelScheduledValues(now); // Cancela fades anteriores
                instance.gain.gain.setValueAtTime(instance.gain.gain.value, now); // Define o valor inicial para o fade
                instance.gain.gain.linearRampToValueAtTime(0.001, now + duration); // Fade para quase zero

                // Agenda a paragem do som e a desconexão após o fade-out
                instance.source.stop(now + duration + 0.05); // Para um pouco depois do fade
            } catch (error) {
                console.warn("Erro ao aplicar fade-out ou parar som:", error);
                // Fallback: se houver erro no fade, tenta parar imediatamente
                if (instance.source && typeof instance.source.stop === 'function') {
                    instance.source.stop();
                }
            } finally {
                // Desconectar os nós e remover a instância
                setTimeout(() => {
                    if (instance.source) instance.source.disconnect();
                    if (instance.gain) instance.gain.disconnect();
                    data.activePlayingInstances.delete(instance);
                    globalActivePlayingInstances.delete(instance); // Também do set global
                    // Remove a classe 'active' se não houver mais instâncias a tocar para esta célula
                    const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                    if (cell && data.activePlayingInstances.size === 0) {
                        cell.classList.remove('active');
                    }
                }, (duration * 1000) + 100); // Espera o fade mais um pequeno buffer
            }
        }
    });
}


function stopAllSounds() {
    if (audioContext) {
        const now = audioContext.currentTime;
        const fadeDuration = 0.2; // Duração do fade out para parar todos os sons

        // Itera sobre uma cópia do Set para permitir modificações durante a iteração
        const instancesToStop = new Set(globalActivePlayingInstances);

        instancesToStop.forEach(instance => {
            // Verifica se a instância é válida, tem um source e se o gain é um GainNode (e não undefined)
            if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
                try {
                    // Cancela quaisquer valores de volume agendados anteriormente para este som
                    instance.gain.gain.cancelScheduledValues(now);
                    // Define o valor atual do volume para onde ele está agora
                    instance.gain.gain.setValueAtTime(instance.gain.gain.value, now);
                    // Aplica um fade-out linear para 0.001 (quase zero)
                    instance.gain.gain.linearRampToValueAtTime(0.001, now + fadeDuration);
                    
                    // Agenda a paragem do som e a desconexão após o fade-out
                    setTimeout(() => {
                        if (instance.source) {
                            instance.source.stop(); // Parar a fonte
                            instance.source.disconnect(); // Desconectar a fonte
                        }
                        if (instance.gain) {
                            instance.gain.disconnect(); // Desconectar o nó de ganho
                        }
                    }, fadeDuration * 1000 + 50); // Adiciona um pequeno atraso (50ms) para garantir o fade
                } catch (error) {
                    console.warn("Erro ao parar som ou aplicar fade-out:", error);
                    // Fallback: se houver um erro, tenta parar o source diretamente sem fade
                    if (instance.source && typeof instance.source.stop === 'function') {
                        instance.source.stop();
                    }
                }
            }
            // Remove a instância do set global independentemente do sucesso do stop
            globalActivePlayingInstances.delete(instance);
        });

        // O set global é esvaziado aqui, pois todas as instâncias foram tratadas.
        globalActivePlayingInstances.clear();
        
        // Remove a classe 'active' de todas as células para feedback visual
        document.querySelectorAll('.sound-cell.active').forEach(cell => {
            cell.classList.remove('active');
        });

        // Garante que cada som individual limpa suas instâncias ativas
        soundData.forEach(sound => {
            if (sound && sound.activePlayingInstances) {
                sound.activePlayingInstances.clear();
            }
        });
        lastPlayedSoundIndex = null; // Reseta o último som tocado
    }
}


function deleteSoundFromCell(index) {
    // Primeiro, para quaisquer instâncias a tocar para este som
    stopSpecificSoundWithFade(index, 0.1); // Um fade bem rápido para limpar

    soundData[index] = {
        name: translations[currentLanguage].cellEmptyDefault,
        path: null,
        type: 'empty',
        buffer: null,
        isLooping: false,
        color: '#444',
        activePlayingInstances: new Set() // Reseta as instâncias
    };
    saveSoundData(); // Salva o estado vazio
    const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
    updateCellDisplay(cell, soundData[index], true); // Atualiza o display da célula para vazio
}


// --- Controles Globais ---
function setupGlobalControls() {
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const reproduceMultiplosCheckbox = document.getElementById('reproduce-multiplos');
    const autoKillAnteriorCheckbox = document.getElementById('auto-kill-anterior');
    const stopAllSoundsButton = document.getElementById('stop-all-sounds');
    const loadMultipleSoundsButton = document.getElementById('load-multiple-sounds');

    // Volume
    volumeRange.addEventListener('input', () => {
        if (!masterGainNode) initializeAudioContext(); // Garante o contexto antes de ajustar
        masterGainNode.gain.value = parseFloat(volumeRange.value);
        updateVolumeDisplay();
        saveSettings();
    });

    // Checkboxes
    reproduceMultiplosCheckbox.addEventListener('change', () => {
        isReproduceMultiplos = reproduceMultiplosCheckbox.checked;
        saveSettings();
    });
    autoKillAnteriorCheckbox.addEventListener('change', () => {
        isAutoKillAnterior = autoKillAnteriorCheckbox.checked;
        saveSettings();
    });

    // Botão Parar Todos os Sons
    stopAllSoundsButton.addEventListener('click', stopAllSounds);

    // Botão Carregar Múltiplos Sons (NOVO)
    loadMultipleSoundsButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.multiple = true; // Permite seleção de múltiplos ficheiros
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                // Filtra apenas ficheiros de áudio válidos
                const audioFiles = files.filter(file => file.type.startsWith('audio/'));
                if (audioFiles.length > 0) {
                    loadMultipleSounds(audioFiles);
                } else {
                    alert(translations[currentLanguage].howToUseDragDropDesc); // Mensagem de erro se não forem áudio
                }
            }
        };
        input.click();
    });

    // Display de Fade In/Out
    updateFadeInDisplay();
    updateFadeOutDisplay();
}

function updateVolumeDisplay() {
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    volumeDisplay.textContent = `${Math.round(volumeRange.value * 100)}%`;
}

function updateFadeInDisplay() {
    document.getElementById('fadeIn-display').textContent = `${translations[currentLanguage].fadeIn}: ${currentFadeInDuration}s ${currentFadeInDuration === 0 ? translations[currentLanguage].immediate : ''}`;
}

function updateFadeOutDisplay() {
    document.getElementById('fadeOut-display').textContent = `${translations[currentLanguage].fadeOut}: ${currentFadeOutDuration}s ${currentFadeOutDuration === 0 ? translations[currentLanguage].immediate : ''}`;
}


// --- Carregar Múltiplos Sons (NOVO) ---
async function loadMultipleSounds(files) {
    let currentCellIndex = 0;
    for (const file of files) {
        // Encontra a próxima célula vazia para carregar o som
        while (currentCellIndex < soundBoardSize && soundData[currentCellIndex].type !== 'empty') {
            currentCellIndex++;
        }

        if (currentCellIndex >= soundBoardSize) {
            alert(translations[currentLanguage].tooManySounds); // Se não houver mais células vazias
            break;
        }

        try {
            const buffer = await decodeAudioFile(file);
            const color = getRandomColor();

            soundData[currentCellIndex] = {
                name: file.name.split('.')[0],
                path: null,
                type: 'file',
                buffer: buffer,
                isLooping: false,
                color: color,
                activePlayingInstances: new Set()
            };
            const cell = document.querySelector(`.sound-cell[data-index="${currentCellIndex}"]`);
            updateCellDisplay(cell, soundData[currentCellIndex], false);
            currentCellIndex++; // Move para a próxima célula para o próximo ficheiro
        } catch (error) {
            console.error(`Erro ao carregar ${file.name}:`, error);
            alert(`Erro ao carregar o ficheiro ${file.name}. Verifique o formato do áudio.`);
        }
    }
    saveSoundData(); // Salva todos os sons carregados
}

function decodeAudioFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            audioContext.decodeAudioData(e.target.result)
                .then(resolve)
                .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}


// --- Atallhos de Teclado (Com Lógica de Navegação de Faixas) ---
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        // Impede que atalhos de teclado funcionem se estiver a editar texto ou focado num input
        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            return;
        }

        // Controlo de volume com setas
        if (pressedKey === 'arrowup') {
            e.preventDefault();
            const volumeRange = document.getElementById('volume-range');
            volumeRange.value = Math.min(1, parseFloat(volumeRange.value) + 0.05);
            updateVolumeDisplay();
            if (masterGainNode) {
                masterGainNode.gain.value = parseFloat(volumeRange.value);
            }
            saveSettings();
        } else if (pressedKey === 'arrowdown') {
            e.preventDefault();
            const volumeRange = document.getElementById('volume-range');
            volumeRange.value = Math.max(0, parseFloat(volumeRange.value) - 0.05);
            updateVolumeDisplay();
            if (masterGainNode) {
                masterGainNode.gain.value = parseFloat(volumeRange.value);
            }
            saveSettings();
        }
        // Parar todos os sons com ESC
        else if (pressedKey === 'escape') {
            stopAllSounds();
        }
        // Controlo de Fade In com Ctrl + números
        else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault();
            currentFadeInDuration = parseInt(pressedKey);
            updateFadeInDisplay();
            saveSettings();
        }
        // Controlo de Fade Out com Alt + números
        else if (e.altKey && pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault();
            currentFadeOutDuration = parseInt(pressedKey);
            updateFadeOutDisplay();
            saveSettings();
        }
        // NOVO: Navegação de Faixas (GO e GO-)
        else if (pressedKey === ' ' && !e.ctrlKey && !e.altKey) { // Tecla SPACE (GO)
            e.preventDefault(); // Impede o scroll da página, etc.
            let nextIndex = -1; // Inicializa com -1 para indicar que nenhuma próxima faixa válida foi encontrada ainda

            if (currentTrackIndex === -1) {
                // Se nenhuma faixa foi tocada, começa na primeira faixa disponível (índice 0)
                nextIndex = 0;
            } else {
                // Tenta encontrar a próxima faixa preenchida
                nextIndex = currentTrackIndex + 1;
            }
            
            // Itera para encontrar a próxima célula preenchida, saltando vazias
            while (nextIndex < soundData.length && soundData[nextIndex].type === 'empty') {
                nextIndex++;
            }
            
            // Se chegou ao fim e não encontrou uma próxima faixa válida
            if (nextIndex >= soundData.length) {
                nextIndex = -1; // Sinaliza que a navegação chegou ao fim
            }

            if (nextIndex !== -1 && soundData[nextIndex].type !== 'empty') { // Verifica se encontrou uma faixa válida
                playSound(nextIndex, true); // Chama playSound com fromTrackNavigation = true
            } else if (nextIndex === -1 && currentTrackIndex !== -1) {
                 // Caso tenha chegado ao fim das faixas, limpa o estado ativo e para tudo
                stopAllSounds(); // Para todos os sons (se houver algum a tocar)
                currentTrackIndex = -1; // Reset do índice
            }
        } else if (pressedKey === ' ' && e.ctrlKey && !e.altKey) { // Tecla CTRL + SPACE (GO-)
            e.preventDefault(); // Impede o scroll da página, etc.
            let prevIndex = -1;

            if (currentTrackIndex === -1 || currentTrackIndex === 0) {
                // Se nenhuma faixa foi tocada ou está na primeira, vai para a última faixa preenchida
                prevIndex = soundData.length - 1;
            } else {
                // Tenta encontrar a faixa anterior preenchida
                prevIndex = currentTrackIndex - 1;
            }
            
            // Itera para encontrar a faixa anterior preenchida, saltando vazias
            while (prevIndex >= 0 && soundData[prevIndex].type === 'empty') {
                prevIndex--;
            }
            
            // Se chegou ao início e não encontrou uma faixa válida
            if (prevIndex < 0) {
                prevIndex = -1; // Sinaliza que a navegação chegou ao início
            }

            if (prevIndex !== -1 && soundData[prevIndex].type !== 'empty') { // Verifica se encontrou uma faixa válida
                playSound(prevIndex, true); // Chama playSound com fromTrackNavigation = true
            } else if (prevIndex === -1 && currentTrackIndex !== -1) {
                // Caso tenha chegado ao início das faixas, limpa o estado ativo e para tudo
                stopAllSounds();
                currentTrackIndex = -1;
            }
        }
        // Lógica para tocar sons QWERTY, etc. (se nenhuma das condições acima for atendida)
        else {
            const soundIndex = defaultKeys.indexOf(pressedKey);
            if (soundIndex !== -1 && soundData[soundIndex] && soundData[soundIndex].type !== 'empty') {
                playSound(soundIndex);
            }
        }
    });
}


// --- Persistência de Dados (LocalStorage) ---
function saveSoundData() {
    const simplifiedSoundData = soundData.map(sound => ({
        name: sound.name,
        path: sound.path, // Pode ser null para ficheiros locais
        type: sound.type,
        isLooping: sound.isLooping,
        color: sound.color
        // buffer não é salvo porque é um objeto de áudio grande e não serializável
    }));
    localStorage.setItem('soundboard_data', JSON.stringify(simplifiedSoundData));
}

function loadSoundDataFromLocalStorage() {
    const savedData = localStorage.getItem('soundboard_data');
    if (savedData) {
        const loadedData = JSON.parse(savedData);
        loadedData.forEach((data, index) => {
            // Recria o objeto soundData com buffer nulo e Set de instâncias vazio
            soundData[index] = {
                name: data.name,
                path: data.path,
                type: data.type,
                buffer: null, // Buffer deve ser recarregado se 'path' não for nulo
                isLooping: data.isLooping || false,
                color: data.color || '#444',
                activePlayingInstances: new Set()
            };

            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (data.type === 'empty') {
                updateCellDisplay(cell, soundData[index], true);
            } else {
                updateCellDisplay(cell, soundData[index], false);
                // Se for um som preenchido, mas sem path (ficheiro local), fica "carregado" visualmente
                // Mas o buffer será null até ser carregado de novo
            }
            // Se 'path' existir, pode tentar pré-carregar o áudio do URL
            if (data.type === 'url' && data.path) {
                fetch(data.path)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                    .then(buffer => {
                        soundData[index].buffer = buffer;
                    })
                    .catch(e => console.error(`Erro ao pré-carregar áudio de URL para índice ${index}:`, e));
            }
        });
    }
}

function saveSettings() {
    const settings = {
        volume: document.getElementById('volume-range').value,
        reproduceMultiplos: isReproduceMultiplos,
        autoKillAnterior: isAutoKillAnterior,
        fadeInDuration: currentFadeInDuration,
        fadeOutDuration: currentFadeOutDuration,
        language: currentLanguage
    };
    localStorage.setItem('soundboard_settings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('soundboard_settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        document.getElementById('volume-range').value = settings.volume;
        isReproduceMultiplos = settings.reproduceMultiplos;
        document.getElementById('reproduce-multiplos').checked = isReproduceMultiplos;
        isAutoKillAnterior = settings.autoKillAnterior;
        document.getElementById('auto-kill-anterior').checked = isAutoKillAnterior;
        currentFadeInDuration = settings.fadeInDuration || 0;
        currentFadeOutDuration = settings.fadeOutDuration || 0;
        currentLanguage = settings.language || 'pt';

        updateVolumeDisplay();
        updateFadeInDisplay();
        updateFadeOutDisplay();

        // Aplica o volume ao masterGainNode se já estiver inicializado
        if (masterGainNode) {
            masterGainNode.gain.value = parseFloat(settings.volume);
        }
    }
}


// --- Funcionalidades de Idioma ---
function setupLanguageSelector() {
    const langButtons = document.querySelectorAll('.lang-button');
    langButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentLanguage = button.dataset.lang;
            setLanguage(currentLanguage);
            saveSettings(); // Salva o idioma selecionado
        });
    });
}

function setLanguage(lang) {
    // Atualizar o estado ativo dos botões de idioma
    document.querySelectorAll('.lang-button').forEach(button => {
        button.classList.remove('active');
        if (button.dataset.lang === lang) {
            button.classList.add('active');
        }
    });

    // Atualizar textos estáticos
    document.getElementById('main-title').textContent = translations[lang].title;
    document.getElementById('volume-label').textContent = translations[lang].volume + ':';
    document.getElementById('reproduce-multiplos-label').textContent = translations[lang].reproduceMultiplos;
    document.getElementById('auto-kill-anterior-label').textContent = translations[lang].autoKillAnterior;
    document.getElementById('load-multiple-sounds').textContent = translations[lang].loadMultipleSounds;
    document.getElementById('stop-all-sounds').textContent = translations[lang].stopAllSounds;
    document.getElementById('how-to-use-title').textContent = translations[lang].howToUseTitle;

    // Atualizar fade displays
    updateFadeInDisplay();
    updateFadeOutDisplay();

    // Atualizar a seção "Como Usar" dinamicamente
    const howToUseList = document.getElementById('how-to-use-list');
    howToUseList.innerHTML = `
        <li><strong>${translations[lang].howToUseDragDrop}</strong> ${translations[lang].howToUseDragDropDesc}</li>
        <li><strong>${translations[lang].howToUseClick}</strong> ${translations[lang].howToUseClickDesc}</li>
        <li><strong>${translations[lang].howToUseKeyboard}</strong> ${translations[lang].howToUseKeyboardDesc}</li>
        <li><strong>${translations[lang].howToUseStopAll}</strong> ${translations[lang].howToUseStopAllDesc}</li>
        <li><strong>${translations[lang].howToUseAdjustVolume}</strong> ${translations[lang].howToUseAdjustVolumeDesc}</li>
        <li><strong>${translations[lang].howToUseDelete}</strong> ${translations[lang].howToUseDeleteDesc}</li>
        <li><strong>${translations[lang].howToUseReplace}</strong> ${translations[lang].howToUseReplaceDesc}</li>
        <li><strong>${translations[lang].howToUseRename}</strong> ${translations[lang].howToUseRenameDesc}</li>
        <li><strong>${translations[lang].howToUseFadeIn}</strong> ${translations[lang].howToUseFadeInDesc}</li>
        <li><strong>${translations[lang].howToUseFadeOut}</strong> ${translations[lang].howToUseFadeOutDesc}</li>
        <li><strong>${translations[lang].howToUseReproduceMultiplos}</strong> ${translations[lang].howToUseReproduceMultiplosDesc}</li>
        <li><strong>${translations[lang].howToUseAutoKill}</strong> ${translations[lang].howToUseAutoKillDesc}</li>
        <li><strong>${translations[lang].goNextTrack}</strong> ${translations[lang].goNextTrackDesc}</li>
        <li><strong>${translations[lang].goPrevTrack}</strong> ${translations[lang].goPrevTrackDesc}</li>
        <li><strong>${translations[lang].cueListMode}</strong> ${translations[lang].cueListModeDesc}</li>
    `;

    // Atualizar texto das células vazias e tooltips dos botões
    document.querySelectorAll('.sound-cell').forEach(cell => {
        const index = parseInt(cell.dataset.index);
        const data = soundData[index];

        const nameDisplay = cell.querySelector('.sound-name');
        if (nameDisplay) {
            nameDisplay.textContent = data && data.name && data.type !== 'empty' ? data.name : translations[currentLanguage].cellEmptyDefault;
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
            // Garante que o estado visual do loop é atualizado na mudança de idioma
            if (data && data.isLooping) {
                loopButton.classList.add('active');
            } else {
                loopButton.classList.remove('active');
            }
        }
        // Atualiza a exibição completa da célula para garantir que tudo está em ordem
        updateCellDisplay(cell, data, data.type === 'empty');
    });
}


// --- Drag and Drop Global (para carregar em qualquer lugar) ---
function setupDragAndDropGlobal() {
    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy'; // feedback visual de cópia
    });

    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const audioFiles = files.filter(file => file.type.startsWith('audio/'));

        if (audioFiles.length > 0) {
            // Carrega o primeiro ficheiro arrastado para a próxima célula vazia
            let targetIndex = 0;
            while (targetIndex < soundBoardSize && soundData[targetIndex].type !== 'empty') {
                targetIndex++;
            }

            if (targetIndex < soundBoardSize) {
                loadSoundIntoCell(audioFiles[0], targetIndex);
            } else {
                alert(translations[currentLanguage].noEmptyCells); // Mensagem de que não há células vazias
                // Pode abrir o seletor de múltiplos se for o caso
            }
        } else {
            alert(translations[currentLanguage].notAudioFile); // Mensagem se não for ficheiro de áudio
        }
    });
}
