// main.js
// Gerencia a interface do usuário, eventos de teclado e interação com o AudioManager.

// Garante que o objeto global soundboardApp existe e inicializa sub-objetos
window.soundboardApp = window.soundboardApp || {};
window.soundboardApp.audioManager = window.soundboardApp.audioManager || {};
window.soundboardApp.utils = window.soundboardApp.utils || {};
window.soundboardApp.cueGoSystem = window.soundboardApp.cueGoSystem || {};


document.addEventListener('DOMContentLoaded', () => {
    // Definir o número de células e keys padrão
    window.soundboardApp.NUM_CELLS = 40;
    window.soundboardApp.defaultKeys = [
        'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
        'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç',
        'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', ';',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
    ];

    // Variáveis globais para o estado da aplicação
    let soundData = []; // Array para armazenar os AudioBuffers e metadados
    window.soundboardApp.globalActivePlayingInstances = new Set(); // Conjunto global de todas as instâncias de som ativas
    window.soundboardApp.volumeRange = document.getElementById('volumeRange');
    window.soundboardApp.playMultipleCheckbox = document.getElementById('playMultipleSounds');
    window.soundboardApp.autokillModeCheckbox = document.getElementById('autokillMode');
    window.soundboardApp.fadeOutRange = document.getElementById('fadeOutTime');
    window.soundboardApp.fadeInRange = document.getElementById('fadeInTime');
    window.soundboardApp.isHelpVisible = false; // Estado inicial da ajuda
    window.soundboardApp.isContextMenuOpen = false; // Estado do menu de contexto
    let dropTargetCellIndex = null; // Para arrastar e soltar ficheiros

    // Obter elementos do DOM
    const soundboardGrid = document.getElementById('soundboardGrid');
    const loadSoundBtn = document.getElementById('loadSoundBtn');
    const fileInput = document.getElementById('fileInput');
    const stopAllBtn = document.getElementById('stopAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModal');
    const volumeValueSpan = document.getElementById('volumeValue');
    const fadeOutValueSpan = document.getElementById('fadeOutValue');
    const fadeInValueSpan = document.getElementById('fadeInValue');
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModalBtn = document.getElementById('closeHelpModal');
    const languageSelect = document.getElementById('languageSelect');
    const exportSettingsBtn = document.getElementById('exportSettingsBtn');
    const importSettingsBtn = document.getElementById('importSettingsBtn');
    const importFileInput = document.getElementById('importFileInput');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmClearAllBtn = document.getElementById('confirmClearAllBtn');
    const cancelClearAllBtn = document.getElementById('cancelClearAllBtn');

    // Inicializar o contexto de áudio
    window.soundboardApp.audioManager.initAudioContext(window.soundboardApp.volumeRange);

    // Dicionário de traduções (exemplo simplificado)
    const translations = {
        'en': {
            'stopAllSounds': 'Stop All Sounds',
            'clearAllCells': 'Clear All Cells',
            'settings': 'Settings',
            'volume': 'Master Volume',
            'playMultiple': 'Play Multiple Sounds Simultaneously',
            'autokillMode': 'Autokill Previous Sound (QLab-style navigation)',
            'fadeOutTime': 'Fade Out Time (s)',
            'fadeInTime': 'Fade In Time (s)',
            'help': 'Help',
            'close': 'Close',
            'cellEmptyDefault': 'Empty',
            'alertLoadError': 'Error loading {fileName}. Please ensure it is a valid audio file.',
            'alertDecodeError': 'Error decoding audio for {soundName}. The file might be corrupted or in an unsupported format.',
            'alertAudioDecodeError': 'Error decoding audio file: {fileName}. This file type might not be supported, or the file is corrupted.',
            'alertNoEmptyCells': 'No more empty cells available to load {fileName}.',
            'contextMenuPlay': 'Play',
            'contextMenuStop': 'Stop',
            'contextMenuLoop': 'Toggle Loop',
            'contextMenuCue': 'Toggle Cue',
            'contextMenuRename': 'Rename',
            'contextMenuChangeColor': 'Change Color',
            'contextMenuClear': 'Clear Cell',
            'contextMenuRemoveCue': 'Remove Cue',
            'contextMenuSetNextGo': 'Set as Next GO Cue',
            'contextMenuMoveCueUp': 'Move Cue Up',
            'contextMenuMoveCueDown': 'Move Cue Down',
            'contextMenuTogglePlayMultiple': 'Toggle Play Multiple Sounds',
            'contextMenuToggleAutokill': 'Toggle Autokill Mode',
            'contextMenuImportSound': 'Import Sound',
            'contextMenuExportSound': 'Export Sound',
            'confirmClearAllTitle': 'Confirm Clear All Cells',
            'confirmClearAllMessage': 'Are you sure you want to clear all sound cells? This action cannot be undone.',
            'confirmClearAllYes': 'Yes, Clear All',
            'confirmClearAllNo': 'No, Cancel',
            'cuedSoundIndicator': 'Cued',
            'renamePrompt': 'Enter new name for sound:',
            'exportSuccess': 'Settings exported successfully!',
            'importSuccess': 'Settings imported successfully!',
            'importError': 'Error importing settings. Invalid file or data format.',
            'alertNoSoundToExport': 'There is no sound loaded in this cell to export.'
        },
        'pt': {
            'stopAllSounds': 'Parar Todos os Sons',
            'clearAllCells': 'Limpar Todas as Células',
            'settings': 'Definições',
            'volume': 'Volume Master',
            'playMultiple': 'Reproduzir Múltiplos Sons Simultaneamente',
            'autokillMode': 'Parar Som Anterior (Navegação estilo QLab)',
            'fadeOutTime': 'Tempo de Fade Out (s)',
            'fadeInTime': 'Tempo de Fade In (s)',
            'help': 'Ajuda',
            'close': 'Fechar',
            'cellEmptyDefault': 'Vazio',
            'alertLoadError': 'Erro ao carregar {fileName}. Por favor, verifique se é um ficheiro de áudio válido.',
            'alertDecodeError': 'Erro ao descodificar áudio para {soundName}. O ficheiro pode estar corrompido ou num formato não suportado.',
            'alertAudioDecodeError': 'Erro ao descodificar o ficheiro de áudio: {fileName}. Este tipo de ficheiro pode não ser suportado, ou o ficheiro está corrompido.',
            'alertNoEmptyCells': 'Não há mais células vazias disponíveis para carregar {fileName}.',
            'contextMenuPlay': 'Reproduzir',
            'contextMenuStop': 'Parar',
            'contextMenuLoop': 'Alternar Loop',
            'contextMenuCue': 'Alternar Cue',
            'contextMenuRename': 'Renomear',
            'contextMenuChangeColor': 'Mudar Cor',
            'contextMenuClear': 'Limpar Célula',
            'contextMenuRemoveCue': 'Remover Cue',
            'contextMenuSetNextGo': 'Definir como Próximo Cue GO',
            'contextMenuMoveCueUp': 'Mover Cue para Cima',
            'contextMenuMoveCueDown': 'Mover Cue para Baixo',
            'contextMenuTogglePlayMultiple': 'Alternar Reprodução Múltipla',
            'contextMenuToggleAutokill': 'Alternar Modo Autokill',
            'contextMenuImportSound': 'Importar Som',
            'contextMenuExportSound': 'Exportar Som',
            'confirmClearAllTitle': 'Confirmar Limpar Todas as Células',
            'confirmClearAllMessage': 'Tem a certeza que deseja limpar todas as células de som? Esta ação não pode ser desfeita.',
            'confirmClearAllYes': 'Sim, Limpar Tudo',
            'confirmClearAllNo': 'Não, Cancelar',
            'cuedSoundIndicator': 'Cued',
            'renamePrompt': 'Introduza o novo nome para o som:',
            'exportSuccess': 'Definições exportadas com sucesso!',
            'importSuccess': 'Definições importadas com sucesso!',
            'importError': 'Erro ao importar definições. Ficheiro ou formato de dados inválido.',
            'alertNoSoundToExport': 'Não há som carregado nesta célula para exportar.'
        }
    };

    let currentLanguage = 'en'; // Idioma padrão

    function getTranslation(key) {
        return translations[currentLanguage][key] || key;
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = getTranslation(key);
        });
        // Atualizar textos dos inputs range
        document.getElementById('volumeLabel').textContent = getTranslation('volume');
        document.getElementById('playMultipleLabel').textContent = getTranslation('playMultiple');
        document.getElementById('autokillModeLabel').textContent = getTranslation('autokillMode');
        document.getElementById('fadeOutTimeLabel').textContent = getTranslation('fadeOutTime');
        document.getElementById('fadeInTimeLabel').textContent = getTranslation('fadeInTime');

        // Atualizar textos do modal de confirmação
        document.getElementById('confirmationModalTitle').textContent = getTranslation('confirmClearAllTitle');
        document.getElementById('confirmationModalMessage').textContent = getTranslation('confirmClearAllMessage');
        document.getElementById('confirmClearAllBtn').textContent = getTranslation('confirmClearAllYes');
        document.getElementById('cancelClearAllBtn').textContent = getTranslation('confirmClearAllNo');

        // Atualizar os nomes das células que estão vazias
        for (let i = 0; i < window.soundboardApp.NUM_CELLS; i++) {
            const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
            if (cell && !soundData[i]) { // Se a célula estiver vazia
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
            } else if (cell && soundData[i] && soundData[i].isCued) {
                // Se a célula tiver um som e estiver 'cued', atualiza o indicador
                updateCellDisplay(cell, soundData[i], false, getTranslation);
            }
        }
    }


    // Funções de Utilidade
    window.soundboardApp.utils.getRandomHSLColor = () => {
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(Math.random() * (70 - 40 + 1)) + 40; // 40-70% saturação
        const l = Math.floor(Math.random() * (70 - 40 + 1)) + 40; // 40-70% luminosidade
        return `hsl(${h}, ${s}%, ${l}%)`;
    };

    // Gerenciamento de Cues estilo QLab
    window.soundboardApp.cueGoSystem = (function() {
        let cuedSounds = []; // Array de índices das células em fila
        let currentCueIndex = -1; // Índice atual na fila de cues

        function addCue(index) {
            if (!cuedSounds.includes(index)) {
                cuedSounds.push(index);
                // Ordenar para garantir que GO e GO- funcionem sequencialmente
                cuedSounds.sort((a, b) => a - b);
                updateCueDisplay(index, true);
                saveSettings(); // Salvar estado do cue
                console.log(`Célula ${index} adicionada à fila de cues. Fila:`, cuedSounds);
            }
        }

        function removeCue(index) {
            const initialLength = cuedSounds.length;
            cuedSounds = cuedSounds.filter(c => c !== index);
            if (cuedSounds.length < initialLength) {
                updateCueDisplay(index, false);
                // Ajustar currentCueIndex se o cue removido for o atual ou estiver antes
                if (currentCueIndex >= 0 && index <= cuedSounds[currentCueIndex]) {
                    currentCueIndex = Math.max(-1, currentCueIndex - 1);
                }
                saveSettings(); // Salvar estado do cue
                console.log(`Célula ${index} removida da fila de cues. Fila:`, cuedSounds);
            }
        }

        function removeAllCues(soundData) {
            cuedSounds.forEach(index => {
                updateCueDisplay(index, false);
                if (soundData[index]) {
                    soundData[index].isCued = false;
                }
            });
            cuedSounds = [];
            currentCueIndex = -1;
            saveSettings();
            console.log("Todas as cues removidas.");
        }

        function toggleCue(index) {
            if (soundData[index]) {
                soundData[index].isCued = !soundData[index].isCued;
                if (soundData[index].isCued) {
                    addCue(index);
                } else {
                    removeCue(index);
                }
            }
        }

        function setNextGoCue(index) {
            if (cuedSounds.includes(index)) {
                currentCueIndex = cuedSounds.indexOf(index);
                console.log(`Próximo GO cue definido para a célula ${index}.`);
                updateAllCueDisplays();
            } else {
                console.warn(`Célula ${index} não está na fila de cues.`);
            }
        }

        function moveCue(index, direction) {
            const oldIndexInQueue = cuedSounds.indexOf(index);
            if (oldIndexInQueue === -1) return;

            const newIndexInQueue = oldIndexInQueue + direction; // direction: -1 for up, 1 for down

            if (newIndexInQueue >= 0 && newIndexInQueue < cuedSounds.length) {
                const [movedCue] = cuedSounds.splice(oldIndexInQueue, 1);
                cuedSounds.splice(newIndexInQueue, 0, movedCue);
                updateAllCueDisplays(); // Recarregar todos os destaques de cue
                saveSettings();
                console.log(`Cue ${index} movida para a posição ${newIndexInQueue}. Fila:`, cuedSounds);
            }
        }

        function goNextCue() {
            if (cuedSounds.length === 0) {
                console.log("Nenhuma cue na fila.");
                return;
            }

            // Se currentCueIndex for -1, começa do primeiro cue disponível que não está a tocar
            if (currentCueIndex === -1) {
                const firstAvailable = cuedSounds.find(idx => {
                    const sound = soundData[idx];
                    return sound && sound.audioBuffer && sound.activePlayingInstances.size === 0;
                });
                if (firstAvailable !== undefined) {
                    currentCueIndex = cuedSounds.indexOf(firstAvailable);
                } else {
                    console.log("Nenhum cue disponível para GO.");
                    return;
                }
            } else {
                // Procura o próximo cue que não está a tocar
                let nextAvailableIndex = -1;
                for (let i = currentCueIndex + 1; i < cuedSounds.length; i++) {
                    const idx = cuedSounds[i];
                    const sound = soundData[idx];
                    if (sound && sound.audioBuffer && sound.activePlayingInstances.size === 0) {
                        nextAvailableIndex = i;
                        break;
                    }
                }
                if (nextAvailableIndex !== -1) {
                    currentCueIndex = nextAvailableIndex;
                } else {
                    console.log("Não há mais cues disponíveis para GO.");
                    return; // Permite que o último cue continue a ser GO'd se pressionado novamente
                }
            }

            const soundIndex = cuedSounds[currentCueIndex];
            if (soundIndex !== undefined && soundData[soundIndex] && soundData[soundIndex].audioBuffer) {
                window.soundboardApp.audioManager.playSound(
                    soundIndex,
                    soundData,
                    window.soundboardApp.audioContext,
                    window.soundboardApp.playMultipleCheckbox,
                    window.soundboardApp.autokillModeCheckbox,
                    window.soundboardApp.globalActivePlayingInstances,
                    parseFloat(window.soundboardApp.fadeInRange.value),
                    parseFloat(window.soundboardApp.fadeOutRange.value),
                    window.soundboardApp.volumeRange
                );
                updateAllCueDisplays(); // Atualiza o destaque após tocar
            } else {
                console.warn(`Célula ${soundIndex} (GO cue) está vazia ou áudio não carregado.`);
                // Se o cue atual for inválido, tenta ir para o próximo automaticamente
                goNextCue();
            }
        }

        function goPreviousCue() {
            if (cuedSounds.length === 0) {
                console.log("Nenhuma cue na fila.");
                return;
            }

            if (currentCueIndex > 0) {
                currentCueIndex--;
            } else if (currentCueIndex === 0) {
                // Já está no primeiro cue, não faz nada ou wrap around
                console.log("Já está no primeiro cue cued.");
                return;
            } else { // currentCueIndex === -1, significa que ainda não começou
                currentCueIndex = 0; // Vai para o primeiro cue cued
            }

            const soundIndex = cuedSounds[currentCueIndex];
            if (soundIndex !== undefined && soundData[soundIndex] && soundData[soundIndex].audioBuffer) {
                // Não toca, apenas seleciona. QLab Go- apenas move o cursor.
                updateAllCueDisplays();
            } else {
                console.warn(`Célula ${soundIndex} (GO- cue) está vazia ou áudio não carregado.`);
                // Se o cue anterior for inválido, tenta ir para o anterior automaticamente
                goPreviousCue();
            }
        }

        function updateCueDisplay(index, isCued) {
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                if (isCued) {
                    cell.classList.add('cued');
                    const cuedIndicator = document.createElement('span');
                    cuedIndicator.classList.add('cued-indicator');
                    cuedIndicator.textContent = getTranslation('cuedSoundIndicator');
                    cell.appendChild(cuedIndicator);
                } else {
                    cell.classList.remove('cued');
                    const cuedIndicator = cell.querySelector('.cued-indicator');
                    if (cuedIndicator) {
                        cuedIndicator.remove();
                    }
                }
            }
        }

        function updateAllCueDisplays() {
            document.querySelectorAll('.sound-cell.cued').forEach(cell => {
                cell.classList.remove('cued', 'next-go-cue'); // Remove todas as classes de cue primeiro
                const cuedIndicator = cell.querySelector('.cued-indicator');
                if (cuedIndicator) cuedIndicator.remove();
            });

            cuedSounds.forEach(index => {
                const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                if (cell) {
                    cell.classList.add('cued');
                    let cuedIndicator = cell.querySelector('.cued-indicator');
                    if (!cuedIndicator) {
                        cuedIndicator = document.createElement('span');
                        cuedIndicator.classList.add('cued-indicator');
                        cell.appendChild(cuedIndicator);
                    }
                    cuedIndicator.textContent = getTranslation('cuedSoundIndicator');
                    if (index === cuedSounds[currentCueIndex]) {
                        cell.classList.add('next-go-cue');
                    }
                }
            });
        }

        function getCuedSounds() {
            return cuedSounds;
        }

        function getCurrentCueIndex() {
            return currentCueIndex;
        }

        function setCuedSounds(cues) {
            cuedSounds = cues;
            cuedSounds.sort((a, b) => a - b); // Garantir ordenação após carregar
            updateAllCueDisplays();
        }

        function setCurrentCueIndex(index) {
            currentCueIndex = index;
            updateAllCueDisplays();
        }

        return {
            addCue,
            removeCue,
            removeAllCues,
            toggleCue,
            setNextGoCue,
            moveCue,
            goNextCue,
            goPreviousCue,
            updateCueDisplay,
            updateAllCueDisplays,
            getCuedSounds,
            getCurrentCueIndex,
            setCuedSounds,
            setCurrentCueIndex
        };
    })();

    // Funções de UI
    function createSoundCell(index) {
        const cell = document.createElement('div');
        cell.classList.add('sound-cell');
        cell.dataset.index = index;
        cell.tabIndex = 0; // Torna a célula focável

        const nameDiv = document.createElement('div');
        nameDiv.classList.add('sound-name');
        nameDiv.textContent = getTranslation('cellEmptyDefault');
        cell.appendChild(nameDiv);

        const keyDiv = document.createElement('div');
        keyDiv.classList.add('key-display');
        keyDiv.textContent = window.soundboardApp.defaultKeys[index];
        cell.appendChild(keyDiv);

        const loopIndicator = document.createElement('span');
        loopIndicator.classList.add('loop-indicator', 'hidden'); // Inicialmente oculto
        loopIndicator.textContent = 'LOOP'; // Ou um ícone, se preferir
        cell.appendChild(loopIndicator);

        // Adiciona um evento de clique à célula para carregar um som
        cell.addEventListener('click', (e) => {
            if (e.target.closest('.context-menu')) { // Evita cliques na célula ao clicar no menu
                return;
            }
            if (soundData[index] && soundData[index].audioBuffer) {
                // Som já carregado, tocar
                window.soundboardApp.audioManager.playSound(
                    index,
                    soundData,
                    window.soundboardApp.audioContext,
                    window.soundboardApp.playMultipleCheckbox,
                    window.soundboardApp.autokillModeCheckbox,
                    window.soundboardApp.globalActivePlayingInstances,
                    parseFloat(window.soundboardApp.fadeInRange.value),
                    parseFloat(window.soundboardApp.fadeOutRange.value),
                    window.soundboardApp.volumeRange
                );
            } else {
                // Célula vazia, abre o diálogo de ficheiro
                dropTargetCellIndex = index; // Define o índice da célula de destino
                fileInput.click();
            }
        });

        // Drag-and-drop para células
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
        });

        cell.addEventListener('dragleave', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            dropTargetCellIndex = index; // Define o índice da célula de destino
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                if (files.length === 1) {
                    window.soundboardApp.audioManager.loadFileIntoCell(
                        files[0],
                        cell,
                        dropTargetCellIndex,
                        soundData,
                        window.soundboardApp.audioContext,
                        updateCellDisplay,
                        getTranslation,
                        saveSettings
                    );
                } else {
                    // Se múltiplos ficheiros forem arrastados, pergunta ao utilizador o que fazer
                    showMultipleFilesDialog(files, dropTargetCellIndex);
                }
            }
        });

        return cell;
    }

    function showMultipleFilesDialog(files, startIndex) {
        // Implementar um modal ou prompt mais amigável para perguntar ao utilizador.
        // Por agora, vamos apenas carregá-los sequencialmente a partir do startIndex.
        const confirmLoad = confirm(`Detetados ${files.length} ficheiros. Deseja carregá-los sequencialmente a partir da célula ${startIndex + 1}?`);
        if (confirmLoad) {
            window.soundboardApp.audioManager.loadMultipleFilesIntoCells(
                files,
                startIndex,
                soundData,
                window.soundboardApp.audioContext,
                updateCellDisplay,
                getTranslation,
                saveSettings
            );
        }
    }


    function updateCellDisplay(cell, soundInfo, isEmpty, getTranslationCallback) {
        const nameDiv = cell.querySelector('.sound-name');
        const keyDiv = cell.querySelector('.key-display');
        const loopIndicator = cell.querySelector('.loop-indicator');
        const cuedIndicator = cell.querySelector('.cued-indicator'); // Get cued indicator

        cell.style.backgroundColor = isEmpty ? '' : soundInfo.color;
        cell.classList.toggle('empty', isEmpty);

        nameDiv.textContent = isEmpty ? getTranslationCallback('cellEmptyDefault') : soundInfo.name;
        keyDiv.textContent = soundInfo.key || window.soundboardApp.defaultKeys[cell.dataset.index];

        if (loopIndicator) {
            loopIndicator.classList.toggle('hidden', !soundInfo.isLooping);
        }

        // Update cued indicator
        if (soundInfo.isCued) {
            if (!cuedIndicator) {
                const newCuedIndicator = document.createElement('span');
                newCuedIndicator.classList.add('cued-indicator');
                newCuedIndicator.textContent = getTranslationCallback('cuedSoundIndicator');
                cell.appendChild(newCuedIndicator);
            } else {
                cuedIndicator.textContent = getTranslationCallback('cuedSoundIndicator');
                cuedIndicator.classList.remove('hidden');
            }
            cell.classList.add('cued');
        } else {
            if (cuedIndicator) {
                cuedIndicator.remove();
            }
            cell.classList.remove('cued');
        }
        // A classe 'next-go-cue' é gerida separadamente pelo cueGoSystem.updateAllCueDisplays
    }

    function renderSoundboard() {
        soundboardGrid.innerHTML = ''; // Limpar grid existente
        for (let i = 0; i < window.soundboardApp.NUM_CELLS; i++) {
            const cell = createSoundCell(i);
            soundboardGrid.appendChild(cell);
            // Inicializar o display da célula
            if (soundData[i]) {
                updateCellDisplay(cell, soundData[i], false, getTranslation);
                // Restaurar o estado "playing-feedback" se o som estiver ativo (útil após reload da página)
                if (soundData[i].activePlayingInstances && soundData[i].activePlayingInstances.size > 0) {
                    cell.classList.add('active', 'playing-feedback');
                }
            } else {
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i], isLooping: false, isCued: false }, true, getTranslation);
            }
        }
        window.soundboardApp.cueGoSystem.updateAllCueDisplays(); // Atualizar destaque de cues
    }

    // Gerenciamento de eventos de teclado
    document.addEventListener('keydown', (e) => {
        // Ignorar eventos de teclado se um modal estiver aberto
        if (settingsModal.classList.contains('show') || helpModal.classList.contains('show') || confirmationModal.classList.contains('show')) {
            return;
        }

        // Ignorar eventos de teclado se o menu de contexto estiver aberto
        if (window.soundboardApp.isContextMenuOpen) {
            e.preventDefault(); // Evita que a tecla afete a página por trás do menu
            return;
        }

        // Se o foco estiver num campo de texto, não acionar atalhos
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const pressedKey = e.key.toUpperCase();
        let handled = false;

        // Teclas especiais (Esc, Backspace, Space)
        if (pressedKey === 'ESCAPE') {
            e.preventDefault();
            window.soundboardApp.audioManager.stopAllSounds(
                window.soundboardApp.audioContext,
                window.soundboardApp.globalActivePlayingInstances,
                soundData,
                parseFloat(window.soundboardApp.fadeOutRange.value) // Usar fadeOutTime
            );
            handled = true;
        } else if (pressedKey === 'BACKSPACE') {
            e.preventDefault();
            showClearAllConfirmation();
            handled = true;
        } else if (pressedKey === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) { // Tecla GO (espaço)
            e.preventDefault();
            window.soundboardApp.cueGoSystem.goNextCue();
            handled = true;
        } else if (pressedKey === ' ' && e.ctrlKey) { // Tecla GO- (Ctrl + espaço)
            e.preventDefault();
            window.soundboardApp.cueGoSystem.goPreviousCue();
            handled = true;
        } else {
            // Teclas QWERTY e Numéricas
            const indexToPlay = window.soundboardApp.defaultKeys.indexOf(pressedKey);
            if (indexToPlay !== -1) {
                e.preventDefault(); // Prevenir comportamento padrão (ex: scroll com espaço)
                const played = window.soundboardApp.audioManager.playSound(
                    indexToPlay,
                    soundData,
                    window.soundboardApp.audioContext,
                    window.soundboardApp.playMultipleCheckbox,
                    window.soundboardApp.autokillModeCheckbox,
                    window.soundboardApp.globalActivePlayingInstances,
                    parseFloat(window.soundboardApp.fadeInRange.value),
                    parseFloat(window.soundboardApp.fadeOutRange.value),
                    window.soundboardApp.volumeRange
                );
                // REMOVIDO: soundCellElement.classList.add('playing-feedback');
                // Essa responsabilidade é agora totalmente do audioManager.js
                handled = true;
            }
        }

        if (handled) {
            // Se um atalho foi tratado, focar no corpo para evitar que elementos de UI
            // reajam a outras teclas (ex: barra de espaço em botões)
            document.body.focus();
        }
    });

    // Eventos de clique para botões globais
    loadSoundBtn.addEventListener('click', () => {
        dropTargetCellIndex = null; // Não há célula específica para arrastar/soltar
        fileInput.click(); // Aciona o clique no input de ficheiro oculto
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            if (files.length === 1) {
                // Se dropTargetCellIndex não for nulo, significa que foi arrastado para uma célula
                // Se for nulo, tenta encontrar a primeira célula vazia
                let targetIndex = dropTargetCellIndex !== null ? dropTargetCellIndex : findFirstEmptyCell();

                if (targetIndex !== null) {
                    const cell = document.querySelector(`.sound-cell[data-index="${targetIndex}"]`);
                    window.soundboardApp.audioManager.loadFileIntoCell(
                        files[0],
                        cell,
                        targetIndex,
                        soundData,
                        window.soundboardApp.audioContext,
                        updateCellDisplay,
                        getTranslation,
                        saveSettings
                    );
                } else {
                    alert(getTranslation('alertNoEmptyCells').replace('{fileName}', files[0].name));
                }
            } else {
                // Múltiplos ficheiros
                let startIndex = findFirstEmptyCell();
                if (startIndex !== null) {
                    showMultipleFilesDialog(files, startIndex);
                } else {
                    alert(getTranslation('alertNoEmptyCells').replace('{fileName}', files[0].name));
                }
            }
        }
        e.target.value = ''; // Limpar o input para permitir o carregamento do mesmo ficheiro novamente
    });

    stopAllBtn.addEventListener('click', () => {
        window.soundboardApp.audioManager.stopAllSounds(
            window.soundboardApp.audioContext,
            window.soundboardApp.globalActivePlayingInstances,
            soundData,
            parseFloat(window.soundboardApp.fadeOutRange.value)
        );
    });

    clearAllBtn.addEventListener('click', showClearAllConfirmation);

    confirmClearAllBtn.addEventListener('click', () => {
        window.soundboardApp.audioManager.clearAllSoundCells(
            soundData,
            window.soundboardApp.audioContext,
            window.soundboardApp.globalActivePlayingInstances,
            window.soundboardApp.NUM_CELLS,
            updateCellDisplay,
            getTranslation,
            saveSettings
        );
        hideConfirmationModal();
    });

    cancelClearAllBtn.addEventListener('click', hideConfirmationModal);

    function showClearAllConfirmation() {
        confirmationModal.classList.add('show');
    }

    function hideConfirmationModal() {
        confirmationModal.classList.remove('show');
    }


    // Gerenciamento do modal de Definições
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
    closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.remove('show'));

    // Atualizar valor do volume e aplicar
    window.soundboardApp.volumeRange.addEventListener('input', (e) => {
        const volumeValue = parseFloat(e.target.value);
        volumeValueSpan.textContent = Math.round(volumeValue * 100);
        if (window.soundboardApp.masterGainNode) {
            window.soundboardApp.masterGainNode.gain.value = volumeValue;
        }
        saveSettings();
    });

    // Atualizar valor do Fade Out
    window.soundboardApp.fadeOutRange.addEventListener('input', (e) => {
        fadeOutValueSpan.textContent = parseFloat(e.target.value).toFixed(1);
        saveSettings();
    });

    // Atualizar valor do Fade In
    window.soundboardApp.fadeInRange.addEventListener('input', (e) => {
        fadeInValueSpan.textContent = parseFloat(e.target.value).toFixed(1);
        saveSettings();
    });


    // Toggle Play Multiple Sounds
    window.soundboardApp.playMultipleCheckbox.addEventListener('change', saveSettings);

    // Toggle Autokill Mode
    window.soundboardApp.autokillModeCheckbox.addEventListener('change', saveSettings);

    // Gerenciamento do modal de Ajuda
    helpBtn.addEventListener('click', () => {
        window.soundboardApp.isHelpVisible = true;
        helpModal.classList.add('show');
        saveSettings(); // Salvar o estado de visibilidade da ajuda
    });

    closeHelpModalBtn.addEventListener('click', () => {
        window.soundboardApp.isHelpVisible = false;
        helpModal.classList.remove('show');
        saveSettings(); // Salvar o estado de visibilidade da ajuda
    });

    // Alterar Idioma
    languageSelect.addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        applyTranslations();
        saveSettings();
    });

    // Função para encontrar a primeira célula vazia
    function findFirstEmptyCell() {
        for (let i = 0; i < window.soundboardApp.NUM_CELLS; i++) {
            if (!soundData[i]) {
                return i;
            }
        }
        return null;
    }

    // Exportar configurações (incluindo áudio como Data URL)
    exportSettingsBtn.addEventListener('click', () => {
        const settings = {
            soundData: soundData.map(s => s ? {
                name: s.name,
                key: s.key,
                audioDataUrl: s.audioDataUrl, // Exporta a Data URL
                color: s.color,
                isLooping: s.isLooping,
                isCued: s.isCued
            } : null),
            masterVolume: window.soundboardApp.volumeRange.value,
            playMultiple: window.soundboardApp.playMultipleCheckbox.checked,
            autokillMode: window.soundboardApp.autokillModeCheckbox.checked,
            fadeOutTime: window.soundboardApp.fadeOutRange.value,
            fadeInTime: window.soundboardApp.fadeInRange.value,
            isHelpVisible: window.soundboardApp.isHelpVisible,
            currentLanguage: currentLanguage,
            cuedSounds: window.soundboardApp.cueGoSystem.getCuedSounds(), // Export cues
            currentCueIndex: window.soundboardApp.cueGoSystem.getCurrentCueIndex(), // Export current cue index
            lastPlayedSoundIndex: window.soundboardApp.audioManager.getLastPlayedSoundIndex()
        };

        const dataStr = JSON.stringify(settings, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'soundboard_settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(getTranslation('exportSuccess'));
    });

    // Importar configurações
    importSettingsBtn.addEventListener('click', () => importFileInput.click());

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedSettings = JSON.parse(event.target.result);

                // Stop all sounds before importing new settings
                window.soundboardApp.audioManager.stopAllSounds(
                    window.soundboardApp.audioContext,
                    window.soundboardApp.globalActivePlayingInstances,
                    soundData,
                    0 // Immediate stop for import
                );

                // Clear current soundData and visual cells
                for (let i = 0; i < window.soundboardApp.NUM_CELLS; i++) {
                    const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                    if (cell) {
                        updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i], isLooping: false, isCued: false }, true, getTranslation);
                        cell.classList.remove('active', 'playing-feedback');
                    }
                }
                soundData = new Array(window.soundboardApp.NUM_CELLS).fill(null); // Reset soundData

                // Load sounds from imported Data URLs
                const loadPromises = importedSettings.soundData.map(async (s, index) => {
                    if (s && s.audioDataUrl) {
                        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                        if (cell) {
                            await window.soundboardApp.audioManager.loadSoundFromDataURL(
                                s.audioDataUrl,
                                cell,
                                index,
                                s.name,
                                s.key,
                                s.color,
                                s.isLooping,
                                s.isCued, // Pass cued status
                                soundData,
                                window.soundboardApp.audioContext,
                                updateCellDisplay,
                                getTranslation,
                                saveSettings // Pass saveSettings callback
                            );
                        }
                    }
                });

                await Promise.all(loadPromises); // Wait for all sounds to be loaded

                // Apply other settings
                window.soundboardApp.volumeRange.value = importedSettings.masterVolume || 0.7;
                window.soundboardApp.playMultipleCheckbox.checked = importedSettings.playMultiple || false;
                window.soundboardApp.autokillModeCheckbox.checked = importedSettings.autokillMode || false;
                window.soundboardApp.fadeOutRange.value = importedSettings.fadeOutTime !== undefined ? importedSettings.fadeOutTime : 0.5;
                window.soundboardApp.fadeInRange.value = importedSettings.fadeInTime !== undefined ? importedSettings.fadeInTime : 0;
                window.soundboardApp.isHelpVisible = importedSettings.isHelpVisible || false;
                currentLanguage = importedSettings.currentLanguage || 'en';

                // Restore cue system state
                window.soundboardApp.cueGoSystem.setCuedSounds(importedSettings.cuedSounds || []);
                window.soundboardApp.cueGoSystem.setCurrentCueIndex(importedSettings.currentCueIndex !== undefined ? importedSettings.currentCueIndex : -1);
                window.soundboardApp.audioManager.setLastPlayedSoundIndex(importedSettings.lastPlayedSoundIndex !== undefined ? importedSettings.lastPlayedSoundIndex : null);


                // Update UI based on imported settings
                volumeValueSpan.textContent = Math.round(window.soundboardApp.volumeRange.value * 100);
                fadeOutValueSpan.textContent = parseFloat(window.soundboardApp.fadeOutRange.value).toFixed(1);
                fadeInValueSpan.textContent = parseFloat(window.soundboardApp.fadeInRange.value).toFixed(1);
                languageSelect.value = currentLanguage;

                if (window.soundboardApp.isHelpVisible) {
                    helpModal.classList.add('show');
                } else {
                    helpModal.classList.remove('show');
                }

                // Apply master volume to audio context
                if (window.soundboardApp.masterGainNode) {
                    window.soundboardApp.masterGainNode.gain.value = parseFloat(window.soundboardApp.volumeRange.value);
                }

                applyTranslations();
                saveSettings(); // Save the newly imported settings to localStorage
                alert(getTranslation('importSuccess'));
            } catch (error) {
                console.error("Error importing settings:", error);
                alert(getTranslation('importError'));
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Clear the input for next import
    });


    // Gerenciamento do menu de contexto
    const contextMenu = document.getElementById('contextMenu');
    let activeCellIndex = null; // Armazena o índice da célula que ativou o menu

    document.addEventListener('contextmenu', (e) => {
        const cell = e.target.closest('.sound-cell');
        if (cell) {
            e.preventDefault();
            activeCellIndex = parseInt(cell.dataset.index);
            showContextMenu(e.clientX, e.clientY, activeCellIndex);
        } else {
            hideContextMenu();
        }
    });

    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    function showContextMenu(x, y, index) {
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.add('show');
        window.soundboardApp.isContextMenuOpen = true;

        const sound = soundData[index];

        // Atualizar visibilidade dos itens do menu com base no estado da célula
        document.getElementById('contextMenuPlay').style.display = (sound && sound.audioBuffer) ? 'block' : 'none';
        document.getElementById('contextMenuStop').style.display = (sound && sound.activePlayingInstances.size > 0) ? 'block' : 'none';
        document.getElementById('contextMenuLoop').style.display = (sound && sound.audioBuffer) ? 'block' : 'none';
        document.getElementById('contextMenuCue').style.display = (sound && sound.audioBuffer) ? 'block' : 'none';
        document.getElementById('contextMenuRename').style.display = (sound && sound.audioBuffer) ? 'block' : 'none';
        document.getElementById('contextMenuChangeColor').style.display = (sound && sound.audioBuffer) ? 'block' : 'none';
        document.getElementById('contextMenuClear').style.display = (sound && sound.audioBuffer) ? 'block' : 'none';
        document.getElementById('contextMenuExportSound').style.display = (sound && sound.audioDataUrl) ? 'block' : 'none';

        // Atualizar textos de "Toggle Loop" e "Toggle Cue"
        document.getElementById('contextMenuLoop').textContent = getTranslation('contextMenuLoop');
        document.getElementById('contextMenuCue').textContent = getTranslation('contextMenuCue');

        // Itens do menu para o sistema de cues
        document.getElementById('contextMenuRemoveCue').style.display = (sound && sound.isCued) ? 'block' : 'none';
        document.getElementById('contextMenuSetNextGo').style.display = (sound && sound.isCued) ? 'block' : 'none';
        document.getElementById('contextMenuMoveCueUp').style.display = (sound && sound.isCued) ? 'block' : 'none';
        document.getElementById('contextMenuMoveCueDown').style.display = (sound && sound.isCued) ? 'block' : 'none';

        // Atualizar textos dos toggles globais
        document.getElementById('contextMenuTogglePlayMultiple').textContent = getTranslation('contextMenuTogglePlayMultiple');
        document.getElementById('contextMenuToggleAutokill').textContent = getTranslation('contextMenuToggleAutokill');
    }

    function hideContextMenu() {
        contextMenu.classList.remove('show');
        activeCellIndex = null;
        window.soundboardApp.isContextMenuOpen = false;
    }

    // Event listeners para os itens do menu de contexto
    document.getElementById('contextMenuPlay').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            window.soundboardApp.audioManager.playSound(
                activeCellIndex,
                soundData,
                window.soundboardApp.audioContext,
                window.soundboardApp.playMultipleCheckbox,
                window.soundboardApp.autokillModeCheckbox,
                window.soundboardApp.globalActivePlayingInstances,
                parseFloat(window.soundboardApp.fadeInRange.value),
                parseFloat(window.soundboardApp.fadeOutRange.value),
                window.soundboardApp.volumeRange
            );
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuStop').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            window.soundboardApp.audioManager.fadeoutSound(
                activeCellIndex,
                parseFloat(window.soundboardApp.fadeOutRange.value),
                soundData,
                window.soundboardApp.audioContext,
                window.soundboardApp.globalActivePlayingInstances
            );
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuLoop').addEventListener('click', () => {
        if (activeCellIndex !== null && soundData[activeCellIndex]) {
            soundData[activeCellIndex].isLooping = !soundData[activeCellIndex].isLooping;
            const cell = document.querySelector(`.sound-cell[data-index="${activeCellIndex}"]`);
            updateCellDisplay(cell, soundData[activeCellIndex], false, getTranslation);
            saveSettings();
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuCue').addEventListener('click', () => {
        if (activeCellIndex !== null && soundData[activeCellIndex]) {
            window.soundboardApp.cueGoSystem.toggleCue(activeCellIndex);
            saveSettings();
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuRemoveCue').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            window.soundboardApp.cueGoSystem.removeCue(activeCellIndex);
            soundData[activeCellIndex].isCued = false; // Update internal state
            const cell = document.querySelector(`.sound-cell[data-index="${activeCellIndex}"]`);
            updateCellDisplay(cell, soundData[activeCellIndex], false, getTranslation);
            saveSettings();
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuSetNextGo').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            window.soundboardApp.cueGoSystem.setNextGoCue(activeCellIndex);
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuMoveCueUp').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            window.soundboardApp.cueGoSystem.moveCue(activeCellIndex, -1);
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuMoveCueDown').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            window.soundboardApp.cueGoSystem.moveCue(activeCellIndex, 1);
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuRename').addEventListener('click', () => {
        if (activeCellIndex !== null && soundData[activeCellIndex]) {
            const newName = prompt(getTranslation('renamePrompt'), soundData[activeCellIndex].name);
            if (newName !== null && newName.trim() !== "") {
                soundData[activeCellIndex].name = newName.trim();
                const cell = document.querySelector(`.sound-cell[data-index="${activeCellIndex}"]`);
                updateCellDisplay(cell, soundData[activeCellIndex], false, getTranslation);
                saveSettings();
            }
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuChangeColor').addEventListener('click', () => {
        if (activeCellIndex !== null && soundData[activeCellIndex]) {
            soundData[activeCellIndex].color = window.soundboardApp.utils.getRandomHSLColor();
            const cell = document.querySelector(`.sound-cell[data-index="${activeCellIndex}"]`);
            updateCellDisplay(cell, soundData[activeCellIndex], false, getTranslation);
            saveSettings();
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuClear').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            window.soundboardApp.audioManager.clearSoundCell(
                activeCellIndex,
                parseFloat(window.soundboardApp.fadeOutRange.value),
                soundData,
                window.soundboardApp.audioContext,
                window.soundboardApp.globalActivePlayingInstances,
                updateCellDisplay,
                getTranslation,
                saveSettings
            );
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuTogglePlayMultiple').addEventListener('click', () => {
        window.soundboardApp.playMultipleCheckbox.checked = !window.soundboardApp.playMultipleCheckbox.checked;
        saveSettings();
        hideContextMenu();
    });

    document.getElementById('contextMenuToggleAutokill').addEventListener('click', () => {
        window.soundboardApp.autokillModeCheckbox.checked = !window.soundboardApp.autokillModeCheckbox.checked;
        saveSettings();
        hideContextMenu();
    });

    document.getElementById('contextMenuImportSound').addEventListener('click', () => {
        if (activeCellIndex !== null) {
            dropTargetCellIndex = activeCellIndex; // Define a célula de destino para a importação
            fileInput.click();
            hideContextMenu();
        }
    });

    document.getElementById('contextMenuExportSound').addEventListener('click', () => {
        if (activeCellIndex !== null && soundData[activeCellIndex] && soundData[activeCellIndex].audioDataUrl) {
            const soundToExport = soundData[activeCellIndex];
            const exportData = {
                name: soundToExport.name,
                key: soundToExport.key,
                audioDataUrl: soundToExport.audioDataUrl,
                color: soundToExport.color,
                isLooping: soundToExport.isLooping,
                isCued: soundToExport.isCued
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${soundToExport.name || 'exported_sound'}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(getTranslation('exportSuccess'));
        } else {
            alert(getTranslation('alertNoSoundToExport'));
        }
        hideContextMenu();
    });


    // Funções para salvar e carregar configurações
    function saveSettings() {
        const settings = {
            soundData: soundData.map(s => s ? {
                name: s.name,
                key: s.key,
                audioDataUrl: s.audioDataUrl, // Salvar a Data URL
                color: s.color,
                isLooping: s.isLooping,
                isCued: s.isCued // Salvar estado do cue
            } : null),
            masterVolume: window.soundboardApp.volumeRange.value,
            playMultiple: window.soundboardApp.playMultipleCheckbox.checked,
            autokillMode: window.soundboardApp.autokillModeCheckbox.checked,
            fadeOutTime: window.soundboardApp.fadeOutRange.value,
            fadeInTime: window.soundboardApp.fadeInRange.value,
            isHelpVisible: window.soundboardApp.isHelpVisible,
            currentLanguage: currentLanguage,
            cuedSounds: window.soundboardApp.cueGoSystem.getCuedSounds(), // Salvar cues
            currentCueIndex: window.soundboardApp.cueGoSystem.getCurrentCueIndex(), // Salvar índice do cue atual
            lastPlayedSoundIndex: window.soundboardApp.audioManager.getLastPlayedSoundIndex()
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settings));
        console.log("Definições guardadas.");
    }

    async function loadSettings() {
        const savedSettings = localStorage.getItem('soundboardSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);

                // Initialize soundData with nulls for all cells first
                soundData = new Array(window.soundboardApp.NUM_CELLS).fill(null);

                // Load sounds from Data URLs
                // Use Promise.all to wait for all sounds to be loaded asynchronously
                const loadPromises = settings.soundData.map(async (s, index) => {
                    if (s && s.audioDataUrl) {
                        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                        if (cell) {
                            await window.soundboardApp.audioManager.loadSoundFromDataURL(
                                s.audioDataUrl,
                                cell,
                                index,
                                s.name,
                                s.key,
                                s.color,
                                s.isLooping,
                                s.isCued, // Pass cued status
                                soundData,
                                window.soundboardApp.audioContext,
                                updateCellDisplay,
                                getTranslation,
                                saveSettings // Pass saveSettings callback
                            );
                        }
                    }
                });

                await Promise.all(loadPromises); // Wait for all sounds to be loaded

                // Apply other settings
                window.soundboardApp.volumeRange.value = settings.masterVolume || 0.7;
                window.soundboardApp.playMultipleCheckbox.checked = settings.playMultiple || false;
                window.soundboardApp.autokillModeCheckbox.checked = settings.autokillMode || false;
                window.soundboardApp.fadeOutRange.value = settings.fadeOutTime !== undefined ? settings.fadeOutTime : 0.5;
                window.soundboardApp.fadeInRange.value = settings.fadeInTime !== undefined ? settings.fadeInTime : 0;
                window.soundboardApp.isHelpVisible = settings.isHelpVisible || false;
                currentLanguage = settings.currentLanguage || 'en';

                // Restore cue system state
                window.soundboardApp.cueGoSystem.setCuedSounds(settings.cuedSounds || []);
                window.soundboardApp.cueGoSystem.setCurrentCueIndex(settings.currentCueIndex !== undefined ? settings.currentCueIndex : -1);
                window.soundboardApp.audioManager.setLastPlayedSoundIndex(settings.lastPlayedSoundIndex !== undefined ? settings.lastPlayedSoundIndex : null);


                // Update UI based on loaded settings
                volumeValueSpan.textContent = Math.round(window.soundboardApp.volumeRange.value * 100);
                fadeOutValueSpan.textContent = parseFloat(window.soundboardApp.fadeOutRange.value).toFixed(1);
                fadeInValueSpan.textContent = parseFloat(window.soundboardApp.fadeInRange.value).toFixed(1);
                languageSelect.value = currentLanguage;

                if (window.soundboardApp.isHelpVisible) {
                    helpModal.classList.add('show');
                } else {
                    helpModal.classList.remove('show');
                }

                // Apply master volume to audio context
                if (window.soundboardApp.masterGainNode) {
                    window.soundboardApp.masterGainNode.gain.value = parseFloat(window.soundboardApp.volumeRange.value);
                }

                applyTranslations();
                renderSoundboard(); // Renderizar novamente para refletir os sons carregados e o estado das cues
                console.log("Definições carregadas.");
            } catch (error) {
                console.error("Erro ao carregar definições:", error);
                // Fallback: Resetar para o estado inicial se houver erro ao carregar
                soundData = new Array(window.soundboardApp.NUM_CELLS).fill(null);
                window.soundboardApp.globalActivePlayingInstances.clear();
                window.soundboardApp.cueGoSystem.setCuedSounds([]);
                window.soundboardApp.cueGoSystem.setCurrentCueIndex(-1);
                window.soundboardApp.audioManager.setLastPlayedSoundIndex(null);
                renderSoundboard();
                applyTranslations();
            }
        } else {
            // Se não houver configurações salvas, inicialize o soundData vazio
            soundData = new Array(window.soundboardApp.NUM_CELLS).fill(null);
            renderSoundboard();
            applyTranslations();
        }
    }


    // Inicialização da aplicação
    loadSettings();
});
