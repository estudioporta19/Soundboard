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
    const fadeInDisplay = document.getElementById('fadeIn-display');
    const langButtons = document.querySelectorAll('.lang-button');

    let audioContext;
    const soundData = []; // { name, key, audioBuffer, audioDataUrl, activePlayingInstances: Set<{source: AudioBufferSourceNode, gain: GainNode}>, color, isLooping }
    const globalActivePlayingInstances = new Set(); // Armazena {source, gainNode} de todas as instâncias a tocar
    let lastPlayedSoundIndex = null;
    let currentFadeOutDuration = 0;
    let currentFadeInDuration = 0;

    let translations = {};
    let currentLanguage = 'pt';

    // NOVO: Índice da célula atualmente "em foco" para a cue list (Go/Go-)
    let currentCueIndex = -1; // -1 significa que nenhuma célula está "selecionada" para cueing

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
            // Fallback para um objeto de tradução mínimo ou alertar o utilizador
            translations = {
                pt: {
                    title: "Erro de Carregamento", mainTitle: "Erro de Carregamento", volumeLabel: "Volume:", playMultipleLabel: "Erro Trad.", autokillLabel: "Erro Trad.", loadMultipleSoundsButton: "Erro Trad.", stopAllSoundsButton: "Erro Trad.", fadeInLabel: "Fade In:", immediateStart: " (Início Imediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Paragem Imediata)", howToUseTitle: "Erro!", dragDropHelp: "Erro de tradução.", clickHelp: "Erro de tradução.", shortcutsHelp: "Erro de tradução.", stopAllHelp: "Erro de tradução.", volumeHelp: "Erro de tradução.", deleteSoundHelp: "Erro de tradução.", replaceSoundHelp: "Erro de tradução.", renameHelp: "Erro de tradução.", fadeInHelp: "Erro de tradução.", fadeOutControlHelp: "Erro de tradução.", playMultipleModeHelp: "Erro de tradução.", autokillModeHelp: "Erro de tradução.", alertInvalidFile: "Tipo de ficheiro inválido.", alertLoadError: "Não foi possível carregar áudio.", alertDecodeError: "Erro ao descodificar áudio.", alertNoEmptyCells: "Sem mais células vazias.", cellEmptyText: "Clique para carregar som", cellNoName: "Sem Nome", cellEmptyDefault: "Vazio", loopButtonTitle: "Loop (Alternar)",
                    // NOVAS TRADUÇÕES PARA A CUE LIST
                    cueHelp: "Use SPACE para tocar o próximo som na cue list. Use CTRL+SPACE para o som anterior.",
                    alertNoSoundToCue: "Não há sons carregados para a cue list."
                },
                en: {
                    title: "Loading Error", mainTitle: "Loading Error", volumeLabel: "Volume:", playMultipleLabel: "Trad. Error", autokillLabel: "Trad. Error", loadMultipleSoundsButton: "Trad. Error", stopAllSoundsButton: "Trad. Error", fadeInLabel: "Fade In:", immediateStart: " (Immediate Start)", fadeOutLabel: "Fade Out:", immediateStop: " (Immediate Stop)", howToUseTitle: "Error!", dragDropHelp: "Translation error.", clickHelp: "Translation error.", shortcutsHelp: "Translation error.", stopAllHelp: "Translation error.", volumeHelp: "Translation error.", deleteSoundHelp: "Translation error.", replaceSoundHelp: "Translation error.", renameHelp: "Translation error.", fadeInHelp: "Translation error.", fadeOutControlHelp: "Translation error.", playMultipleModeHelp: "Translation error.", autokillModeHelp: "Translation error.", alertInvalidFile: "Invalid file type.", alertLoadError: "Could not load audio.", alertDecodeError: "Error decoding audio.", alertNoEmptyCells: "No more empty cells.", cellEmptyText: "Click to load sound", cellNoName: "No Name", cellEmptyDefault: "Empty", loopButtonTitle: "Loop (Toggle)",
                    // NEW TRANSLATIONS FOR CUE LIST
                    cueHelp: "Use SPACE to play the next sound in the cue list. Use CTRL+SPACE for the previous sound.",
                    alertNoSoundToCue: "No sounds loaded for cue list."
                },
                it: {
                    title: "Errore di Caricamento", mainTitle: "Errore di Caricamento", volumeLabel: "Volume:", playMultipleLabel: "Errore Trad.", autokillLabel: "Errore Trad.", loadMultipleSoundsButton: "Errore Trad.", stopAllSoundsButton: "Errore Trad.", fadeInLabel: "Fade In:", immediateStart: " (Avvio Immediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Arresto Immediato)", howToUseTitle: "Errore!", dragDropHelp: "Errore di traduzione.", clickHelp: "Errore di traduzione.", shortcutsHelp: "Errore di traduzione.", stopAllHelp: "Errore di traduzione.", volumeHelp: "Errore di traduzione.", deleteSoundHelp: "Errore di traduzione.", replaceSoundHelp: "Errore di traduzione.", renameHelp: "Errore de traduzione.", fadeInHelp: "Errore de traduzione.", fadeOutControlHelp: "Errore de traduzione.", playMultipleModeHelp: "Errore de traduzione.", autokillModeHelp: "Errore de traduzione.", alertInvalidFile: "Invalid file type.", alertLoadError: "Could not load audio.", alertDecodeError: "Error decoding audio.", alertNoEmptyCells: "No more empty cells.", cellEmptyText: "Clicca per caricare il suono", cellNoName: "Senza Nome", cellEmptyDefault: "Vuoto", loopButtonTitle: "Loop (Alterna)",
                    // NUOVE TRADUZIONI PER LA CUE LIST
                    cueHelp: "Usa SPAZIO per riprodurre il prossimo suono nella cue list. Usa CTRL+SPAZIO per il suono precedente.",
                    alertNoSoundToCue: "Nessun suono caricato per la cue list."
                }
            };
            setLanguage('pt');
        } catch (error) {
            console.error('Erro ao carregar traduções:', error);
            // Fallback para um objeto de tradução mínimo ou alertar o utilizador
            // (Se o translations.json não puder ser carregado, ele já está preenchido aqui)
            setLanguage('pt'); // Tenta definir PT com o fallback
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
                    // Range inputs don't have textContent directly, their labels do
                } else if (element.tagName === 'INPUT' && (element.type === 'checkbox' || element.type === 'radio')) {
                    // Checkboxes/radios usually have associated labels, not textContent on themselves
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

        // Atualizar texto das células vazias e tooltips dos botões
        document.querySelectorAll('.sound-cell').forEach(cell => { // Itera todas as células
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
            // NOVO: Atualiza a tooltip do botão de loop
            const loopButton = cell.querySelector('.loop-button');
            if (loopButton) {
                loopButton.title = translations[currentLanguage].loopButtonTitle || 'Loop (Toggle)';
            }

            // Garante que o estado visual do loop é atualizado na mudança de idioma
            if (data && data.isLooping) {
                loopButton.classList.add('active');
            } else if (loopButton) {
                loopButton.classList.remove('active');
            }
        });

        // NOVO: Atualizar a ajuda da cue list
        const cueHelpElement = document.querySelector('[data-key="cueHelp"]');
        if (cueHelpElement) {
            cueHelpElement.innerHTML = translations[currentLanguage].cueHelp;
        }


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
        currentFadeOutDuration = savedSettings.currentFadeOutDuration !== undefined ? savedSettings.currentFadeOutDuration : 0;
        currentFadeInDuration = savedSettings.currentFadeInDuration !== undefined ? savedSettings.currentFadeInDuration : 0;

        updateVolumeDisplay();
        updateFadeOutDisplay();
        updateFadeInDisplay();

        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i);

            const fixedKey = defaultKeys[i];

            if (cellData && cellData.audioDataUrl) {
                const color = cellData.color || getRandomHSLColor();
                // MODIFICADO: Passa isLooping para loadSoundFromDataURL
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
            currentFadeOutDuration: currentFadeOutDuration,
            currentFadeInDuration: currentFadeInDuration,
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null,
                audioDataUrl: data ? data.audioDataUrl : null,
                color: data ? data.color : null,
                isLooping: data ? data.isLooping : false // NOVO: Salva o estado de loop
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

        // NOVO: Botão de Loop
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
            // MODIFICADO: Incluir loop-button no stopPropagation
            if (e.target.closest('.delete-button') ||
                e.target.closest('.replace-sound-button') ||
                e.target.closest('.loop-button') || // NOVO: Não tocar som ao clicar no botão de loop
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
                playSound(index, false); // Clicar numa célula não é uma cue
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

        // NOVO: Event listener para o botão de loop
        const loopButton = cell.querySelector('.loop-button');
        loopButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Previne que o clique ative o som da célula
            if (soundData[index]) {
                soundData[index].isLooping = !soundData[index].isLooping; // Alterna o estado de loop
                loopButton.classList.toggle('active', soundData[index].isLooping); // Atualiza a classe visual
                saveSettings(); // Salva o novo estado de loop

                // Se o som estiver a tocar, atualiza a propriedade loop das instâncias ativas
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
                    activePlayingInstances: new Set(), // MODIFICADO: Set para instâncias {source, gain}
                    color: cellColor,
                    isLooping: false // NOVO: Default para não loop
                };
                updateCellDisplay(cell, soundData[index], false);
                saveSettings();
                updateCueHighlight(); // Atualiza o realce da cue list após carregar um som
            } catch (error) {
                console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                alert(translations[currentLanguage].alertLoadError.replace('{fileName}', file.name));
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '', isLooping: false }, true);
                soundData[index] = null;
                saveSettings();
                updateCueHighlight(); // Atualiza o realce da cue list após um erro de carregamento
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function loadSoundFromDataURL(dataUrl, cell, index, name, key, color, isLoopingState) { // MODIFICADO: Recebe isLoopingState
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
                activePlayingInstances: new Set(), // MODIFICADO: Set para instâncias {source, gain}
                color: color,
                isLooping: isLoopingState // NOVO: Carrega o estado de loop
            };
            updateCellDisplay(cell, soundData[index], false);
            updateCueHighlight(); // Atualiza o realce da cue list após carregar um som
        } catch (error) {
            console.error('Erro ao decodificar áudio do Data URL:', error);
            alert(translations[currentLanguage].alertDecodeError.replace('{soundName}', name || ''));
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '', isLooping: false }, true);
            soundData[index] = null;
            saveSettings();
            updateCueHighlight(); // Atualiza o realce da cue list após um erro de carregamento
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

    // MODIFICADO: Adicionado parâmetro isCueing para controlar o feedback visual da cue list
    function playSound(index, isCueing = false) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            // Se a célula estiver vazia, apenas avança o currentCueIndex e não faz mais nada.
            // A atualização visual do cue será tratada pela função goToNext/PreviousCue.
            if (isCueing) {
                // A função goToNext/PreviousCue já lida com o avanço e busca do próximo som válido.
                // Não precisamos de fazer nada aqui se for uma célula vazia da cue list.
            }
            return;
        }

        initAudioContext();

        // NOVO: Remove a classe 'active' de todas as células para evitar múltiplos realces
        // Isso é importante especialmente para a cue list.
        // REMOVIDO PARA PLAY MULTIPLE: Não devemos remover 'active' de todas as células,
        // apenas daquelas que vão ser parado pelo autokill ou da que acabou de tocar se não estiver no modo play multiple.
        // A classe 'active' indica que o SOM está a tocar, não que a CÉLULA está selecionada.


        // MODIFICADO: auto-kill agora aplica-se a todas as instâncias do *último som*, não só a primeira.
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            const lastSound = soundData[lastPlayedSoundIndex];
            if (lastSound) {
                // Criar uma cópia para iterar, pois o Set será modificado durante o fadeoutInstance
                new Set(lastSound.activePlayingInstances).forEach(instance => {
                    fadeoutInstance(instance.source, instance.gain, 0.2); // Fade out rápido
                    lastSound.activePlayingInstances.delete(instance); // Remover do Set do som
                    globalActivePlayingInstances.delete(instance); // Remover do Set global
                });
                // Remover a classe 'active' da célula anterior se não houver mais instâncias ativas
                const lastCell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
                if (lastCell && lastSound.activePlayingInstances.size === 0) {
                    lastCell.classList.remove('active');
                }
            }
        } else if (!playMultipleCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            // Se NÃO for play multiple E NÃO for autokill, e for um novo som, para o som anterior
            const lastSound = soundData[lastPlayedSoundIndex];
            if (lastSound) {
                new Set(lastSound.activePlayingInstances).forEach(instance => {
                    fadeoutInstance(instance.source, instance.gain, 0.2); // Fade out rápido
                    lastSound.activePlayingInstances.delete(instance);
                    globalActivePlayingInstances.delete(instance);
                });
                const lastCell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
                if (lastCell && lastSound.activePlayingInstances.size === 0) {
                    lastCell.classList.remove('active');
                }
            }
        } else if (!playMultipleCheckbox.checked && lastPlayedSoundIndex === index) {
            // Se o mesmo som for clicado novamente, e não for play multiple, para as instâncias existentes
            new Set(sound.activePlayingInstances).forEach(instance => {
                fadeoutInstance(instance.source, instance.gain, 0.2);
                sound.activePlayingInstances.delete(instance);
                globalActivePlayingInstances.delete(instance);
            });
            const currentCell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (currentCell && sound.activePlayingInstances.size === 0) {
                currentCell.classList.remove('active');
            }
            lastPlayedSoundIndex = null; // Reinicia para permitir que o mesmo som seja "re-cueado" ou tocado de novo
            return; // Sai da função, pois o som foi parado e não deve ser reiniciado
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

        // NOVO: Atualiza o currentCueIndex para o som que acabou de ser tocado via playSound,
        // apenas se não for uma chamada de cue (evitar loops duplos de atualização de cue index).
        if (!isCueing) {
            currentCueIndex = index;
            updateCueHighlight(); // Garante que a célula clicada ou ativada via teclado (não cue) seja destacada.
        }
    }

    // MODIFICADO: Função que realmente toca o som, com fade-in e loop
    function playActualSound(sound, index, fadeInDuration = 0) {
        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;
        source.loop = sound.isLooping; // NOVO: Ativa/desativa o loop com base no estado do som

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

        // MODIFICADO: Adiciona a instância {source, gainNode} aos Sets
        const playingInstance = { source, gain: gainNode, index: index }; // Adiciona o índice para fácil referência
        sound.activePlayingInstances.add(playingInstance);
        globalActivePlayingInstances.add(playingInstance);

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('active');
            // Remove a classe 'cued' se o som começar a tocar
            cell.classList.remove('cued');

            source.onended = () => {
                // Limpeza da instância apenas se não estiver mais a tocar.
                if (!source.loop) { // Se não estiver em loop, remove no final.
                    // Pequeno atraso para garantir que o áudio tenha terminado de decair se houver fade-out
                    setTimeout(() => {
                        // Verifica se a instância ainda está no Set antes de tentar deletar
                        if (sound.activePlayingInstances.has(playingInstance)) {
                            sound.activePlayingInstances.delete(playingInstance);
                        }
                        if (globalActivePlayingInstances.has(playingInstance)) {
                            globalActivePlayingInstances.delete(playingInstance);
                        }
                        // Disconnect nodes only if they are still connected
                        try {
                            source.disconnect();
                        } catch (e) { /* ignore */ }
                        try {
                            gainNode.disconnect();
                        } catch (e) { /* ignore */ }

                        // Se não houver mais instâncias ativas para este som, remove a classe 'active' da célula
                        if (sound.activePlayingInstances.size === 0) {
                            cell.classList.remove('active');
                        }
                        // Se este era o último som a tocar e não há mais cues, remova o cue highlight.
                        if (globalActivePlayingInstances.size === 0 && currentCueIndex === index) {
                             // Não remove o cue highlight aqui, a menos que explicitamente desligado ou re-cueado.
                             // O highlight deve permanecer até que o utilizador mova o cue ou o som seja "disarmado".
                        }

                    }, 50); // Ajuste o tempo se necessário para sincronizar com o fade-out
                }
            };
        }

        // Esta parte da lógica PlayMultiple já é tratada pelo autokill no playSound,
        // mas é importante garantir que o som atual seja iniciado.
        source.start(0);
    }

    // NOVA FUNÇÃO: Para fazer fade out de uma instância específica de som
    function fadeoutInstance(sourceNode, gainNode, duration) {
        if (!audioContext || !sourceNode || !gainNode || !gainNode.gain) return;

        const now = audioContext.currentTime;
        if (duration === 0) {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(0, now);
            try {
                sourceNode.stop(); // Parar a fonte imediatamente
            } catch (e) {
                // Pode dar erro se já parou. Ignorar.
            }
            sourceNode.disconnect();
            gainNode.disconnect();
        } else {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.linearRampToValueAtTime(0.001, now + duration);

            // Agenda a paragem da fonte após o fade-out completo
            const stopTime = now + duration;
            sourceNode.stop(stopTime);

            // Usa onended para limpar após o fade
            sourceNode.onended = () => {
                sourceNode.disconnect();
                gainNode.disconnect();
                // A remoção dos Sets é feita em `fadeoutSound` ou `stopAllSounds` para melhor controle.
            };
        }
    }

    // MODIFICADO: A função fadeoutSound agora chama fadeoutInstance para todas as instâncias ativas do som
    function fadeoutSound(index, duration) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext();
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);

        // Coleta todas as instâncias ativas para este som para poder iterar sobre uma cópia
        const instancesToFade = new Set(sound.activePlayingInstances);

        instancesToFade.forEach(instance => {
            fadeoutInstance(instance.source, instance.gain, duration);
            sound.activePlayingInstances.delete(instance); // Remove da lista de instâncias ativas do som
            globalActivePlayingInstances.delete(instance); // Remove da lista global
        });

        // Só remove a classe 'active' da célula se não houver mais instâncias a tocar para este som.
        // Isso é para lidar com o modo "Play Multiple".
        if (cell && sound.activePlayingInstances.size === 0) {
            cell.classList.remove('active');
        }
        // Se o som que parou era o som "cueado", remova o destaque de cue
        if (currentCueIndex === index && sound.activePlayingInstances.size === 0) {
            // Não remova o cue highlight aqui, a menos que o som seja completamente removido.
            // O cue highlight deve persistir até que o cue seja movido ou resetado.
            // currentCueIndex = -1; // Desativar se desejar que parar remova o cue
            // updateCueHighlight();
        }

        saveSettings();
    }

    function clearSoundCell(index, duration = 0) {
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (!soundData[index]) {
            // Se já estiver vazia, apenas atualiza o display caso o idioma tenha mudado
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index], isLooping: false }, true);
            updateCueHighlight(); // Atualiza o realce da cue list
            return;
        }

        // Fade out e para todas as instâncias ativas para esta célula
        const sound = soundData[index];
        if (sound) {
            const instancesToStop = new Set(sound.activePlayingInstances); // Copia o Set
            instancesToStop.forEach(instance => {
                fadeoutInstance(instance.source, instance.gain, duration);
                sound.activePlayingInstances.delete(instance);
                globalActivePlayingInstances.delete(instance);
            });
        }

        soundData[index] = null;
        updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index], isLooping: false }, true);
        if (cell) {
            cell.classList.remove('active');
            cell.classList.remove('cued'); // Garante que o destaque de cue é removido se a célula for limpa
        }
        if (currentCueIndex === index) {
            currentCueIndex = -1; // Remove o cue se a célula ativa for limpa
            updateCueHighlight();
        }
        saveSettings();
    }

    function updateVolumeDisplay() {
        const volumePercentage = Math.round(volumeRange.value * 100);
        volumeDisplay.textContent = `${volumePercentage}%`;
        if (audioContext && audioContext.masterGainNode) {
            audioContext.masterGainNode.gain.value = volumeRange.value;
        }
    }

    function updateFadeOutDisplay() {
        const label = translations[currentLanguage].fadeOutLabel || 'Fade Out:';
        const immediateStop = translations[currentLanguage].immediateStop || ' (Immediate Stop)';
        fadeOutDisplay.textContent = `${label} ${currentFadeOutDuration}s${currentFadeOutDuration === 0 ? immediateStop : ''}`;
    }

    function updateFadeInDisplay() {
        const label = translations[currentLanguage].fadeInLabel || 'Fade In:';
        const immediateStart = translations[currentLanguage].immediateStart || ' (Immediate Start)';
        fadeInDisplay.textContent = `${label} ${currentFadeInDuration}s${currentFadeInDuration === 0 ? immediateStart : ''}`;
    }

    function stopAllSounds(duration = currentFadeOutDuration) {
        initAudioContext();
        // Crie uma cópia do Set para iterar, pois ele será modificado
        const allInstancesToStop = new Set(globalActivePlayingInstances);

        allInstancesToStop.forEach(instance => {
            fadeoutInstance(instance.source, instance.gain, duration);
            // Remova a instância do Set global imediatamente após agendar o fade/paragem
            globalActivePlayingInstances.delete(instance);

            // Remove a instância do Set específico do soundData
            const sound = soundData[instance.index];
            if (sound && sound.activePlayingInstances.has(instance)) {
                sound.activePlayingInstances.delete(instance);
            }
        });

        // Remove a classe 'active' de todas as células
        document.querySelectorAll('.sound-cell.active').forEach(cell => {
            cell.classList.remove('active');
        });

        // Limpa o último som tocado para o modo autokill
        lastPlayedSoundIndex = null;
        // Não remove o cue highlight aqui, a menos que explicitamente desligado ou re-cueado.
        // currentCueIndex = -1;
        // updateCueHighlight();
    }

    // --- FUNÇÕES DE CUE LIST (GO/GO-) ---

    function updateCueHighlight() {
        document.querySelectorAll('.sound-cell').forEach((cell, idx) => {
            if (idx === currentCueIndex && soundData[idx]) { // Apenas adiciona se houver um som na célula
                cell.classList.add('cued');
            } else {
                cell.classList.remove('cued');
            }
        });
    }

    function goToNextCue() {
        // Encontra o primeiro som carregado se nenhuma célula estiver "cueada"
        if (currentCueIndex === -1) {
            let foundFirst = false;
            for (let i = 0; i < NUM_CELLS; i++) {
                if (soundData[i] && soundData[i].audioBuffer) {
                    currentCueIndex = i;
                    foundFirst = true;
                    break;
                }
            }
            if (!foundFirst) {
                alert(translations[currentLanguage].alertNoSoundToCue);
                return;
            }
        } else {
            // Procura a próxima célula com um som carregado
            let originalCueIndex = currentCueIndex;
            let foundNext = false;
            for (let i = currentCueIndex + 1; i < NUM_CELLS; i++) {
                if (soundData[i] && soundData[i].audioBuffer) {
                    currentCueIndex = i;
                    foundNext = true;
                    break;
                }
            }
            // Se não encontrou no restante, começa do início
            if (!foundNext) {
                for (let i = 0; i <= originalCueIndex; i++) {
                    if (soundData[i] && soundData[i].audioBuffer) {
                        currentCueIndex = i;
                        foundNext = true;
                        break;
                    }
                }
            }
            if (!foundNext) {
                // Caso extremo: todos os sons foram removidos após o cue inicial
                currentCueIndex = -1;
                alert(translations[currentLanguage].alertNoSoundToCue);
                return;
            }
        }
        updateCueHighlight();
    }

    function goToPreviousCue() {
        // Encontra o último som carregado se nenhuma célula estiver "cueada"
        if (currentCueIndex === -1) {
            let foundLast = false;
            for (let i = NUM_CELLS - 1; i >= 0; i--) {
                if (soundData[i] && soundData[i].audioBuffer) {
                    currentCueIndex = i;
                    foundLast = true;
                    break;
                }
            }
            if (!foundLast) {
                alert(translations[currentLanguage].alertNoSoundToCue);
                return;
            }
        } else {
            // Procura a célula anterior com um som carregado
            let originalCueIndex = currentCueIndex;
            let foundPrevious = false;
            for (let i = currentCueIndex - 1; i >= 0; i--) {
                if (soundData[i] && soundData[i].audioBuffer) {
                    currentCueIndex = i;
                    foundPrevious = true;
                    break;
                }
            }
            // Se não encontrou no restante, volta do fim
            if (!foundPrevious) {
                for (let i = NUM_CELLS - 1; i >= originalCueIndex; i--) {
                    if (soundData[i] && soundData[i].audioBuffer) {
                        currentCueIndex = i;
                        foundPrevious = true;
                        break;
                    }
                }
            }
            if (!foundPrevious) {
                // Caso extremo: todos os sons foram removidos após o cue inicial
                currentCueIndex = -1;
                alert(translations[currentLanguage].alertNoSoundToCue);
                return;
            }
        }
        updateCueHighlight();
    }

    // --- Event Listeners Globais ---

    document.addEventListener('keydown', (e) => {
        // Ignorar atalhos se um elemento editável estiver focado
        if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // GO (Space)
        if (e.key === ' ' && !e.ctrlKey) {
            e.preventDefault(); // Previne o scroll da página
            if (currentCueIndex === -1) {
                // Se nenhum som estiver cueado, avança para o primeiro
                goToNextCue();
            } else {
                // Toca o som cueado
                playSound(currentCueIndex, true);
                // E depois avança para o próximo cue
                goToNextCue();
            }
        }
        // GO- (Ctrl + Space)
        else if (e.key === ' ' && e.ctrlKey) {
            e.preventDefault(); // Previne o scroll da página
            if (currentCueIndex === -1) {
                // Se nenhum som estiver cueado, volta para o último
                goToPreviousCue();
            } else {
                // Toca o som cueado
                playSound(currentCueIndex, true);
                // E depois volta para o cue anterior
                goToPreviousCue();
            }
        }
        // Teclas do Soundboard (Q, W, E, etc.)
        else {
            const key = e.key.toLowerCase();
            const index = defaultKeys.indexOf(key);
            if (index !== -1) {
                e.preventDefault(); // Previne ações padrão do navegador para essas teclas
                playSound(index, false); // Não é uma cue operation
            }
        }
    });


    // --- Inicialização ---

    // Volume Control
    volumeRange.addEventListener('input', updateVolumeDisplay);
    volumeRange.addEventListener('change', saveSettings);

    // Fade Out Control
    const fadeOutRange = document.getElementById('fadeOut-range'); // Adicionado, certifique-se de que este ID existe no HTML
    if (fadeOutRange) {
        fadeOutRange.addEventListener('input', (e) => {
            currentFadeOutDuration = parseFloat(e.target.value);
            updateFadeOutDisplay();
        });
        fadeOutRange.addEventListener('change', saveSettings);
    } else {
        console.warn("Elemento 'fadeOut-range' não encontrado. Verifique o seu HTML.");
    }

    // Fade In Control
    const fadeInRange = document.getElementById('fadeIn-range'); // Adicionado, certifique-se de que este ID existe no HTML
    if (fadeInRange) {
        fadeInRange.addEventListener('input', (e) => {
            currentFadeInDuration = parseFloat(e.target.value);
            updateFadeInDisplay();
        });
        fadeInRange.addEventListener('change', saveSettings);
    } else {
        console.warn("Elemento 'fadeIn-range' não encontrado. Verifique o seu HTML.");
    }


    playMultipleCheckbox.addEventListener('change', saveSettings);
    autokillModeCheckbox.addEventListener('change', saveSettings);
    stopAllSoundsBtn.addEventListener('click', () => stopAllSounds(currentFadeOutDuration));

    // Load multiple sounds
    loadSoundsButtonGeneral.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/mp3, audio/wav, audio/ogg';
        input.multiple = true;
        input.onchange = async (event) => {
            const files = Array.from(event.target.files);
            let startIndex = 0;
            // Encontra a primeira célula vazia disponível
            for (let i = 0; i < NUM_CELLS; i++) {
                if (!soundData[i]) {
                    startIndex = i;
                    break;
                }
                startIndex = NUM_CELLS; // Se nenhuma célula vazia for encontrada, define como o final
            }

            if (startIndex >= NUM_CELLS) {
                alert(translations[currentLanguage].alertNoEmptyCells);
                return;
            }

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (startIndex + i < NUM_CELLS) {
                    const cellIndex = startIndex + i;
                    const cell = document.querySelector(`.sound-cell[data-index="${cellIndex}"]`);
                    if (cell) {
                        await loadFileIntoCell(file, cell, cellIndex);
                    }
                } else {
                    console.warn(`Não há mais células vazias para carregar o ficheiro: ${file.name}`);
                    alert(translations[currentLanguage].alertNoEmptyCells);
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

    loadTranslations(); // Carrega as traduções e define o idioma inicial
    loadSettings(); // Carrega as configurações e sons salvos

    // NOVO: Adiciona a ajuda da cue list na secção "Como Usar"
    const howToUseList = document.querySelector('.how-to-use ul');
    if (howToUseList) {
        const cueHelpLi = document.createElement('li');
        cueHelpLi.setAttribute('data-key', 'cueHelp');
        cueHelpLi.innerHTML = translations[currentLanguage].cueHelp;
        howToUseList.appendChild(cueHelpLi);
    } else {
        console.warn("Elemento 'how-to-use ul' não encontrado para adicionar ajuda da cue list.");
    }
});
