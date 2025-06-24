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
                    title: "Erro de Carregamento", mainTitle: "Erro de Carregamento", volumeLabel: "Volume:", playMultipleLabel: "Erro Trad.", autokillLabel: "Erro Trad.", loadMultipleSoundsButton: "Erro Trad.", stopAllSoundsButton: "Erro Trad.", fadeInLabel: "Fade In:", immediateStart: " (Início Imediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Paragem Imediata)", howToUseTitle: "Erro!", dragDropHelp: "Erro de tradução.", clickHelp: "Erro de tradução.", shortcutsHelp: "Erro de tradução.", stopAllHelp: "Erro de tradução.", volumeHelp: "Erro de tradução.", deleteSoundHelp: "Erro de tradução.", replaceSoundHelp: "Erro de tradução.", renameHelp: "Erro de tradução.", fadeInHelp: "Erro de tradução.", fadeOutControlHelp: "Erro de tradução.", playMultipleModeHelp: "Erro de tradução.", autokillModeHelp: "Erro de tradução.", alertInvalidFile: "Tipo de ficheiro inválido.", alertLoadError: "Não foi possível carregar áudio.", alertDecodeError: "Erro ao descodificar áudio.", alertNoEmptyCells: "Sem mais células vazias.", cellEmptyText: "Clique para carregar som", cellNoName: "Sem Nome", cellEmptyDefault: "Vazio", loopButtonTitle: "Loop (Alternar)"
                },
                en: {
                    title: "Loading Error", mainTitle: "Loading Error", volumeLabel: "Volume:", playMultipleLabel: "Trad. Error", autokillLabel: "Trad. Error", loadMultipleSoundsButton: "Trad. Error", stopAllSoundsButton: "Trad. Error", fadeInLabel: "Fade In:", immediateStart: " (Immediate Start)", fadeOutLabel: "Fade Out:", immediateStop: " (Immediate Stop)", howToUseTitle: "Error!", dragDropHelp: "Translation error.", clickHelp: "Translation error.", shortcutsHelp: "Translation error.", stopAllHelp: "Translation error.", volumeHelp: "Translation error.", deleteSoundHelp: "Translation error.", replaceSoundHelp: "Translation error.", renameHelp: "Translation error.", fadeInHelp: "Translation error.", fadeOutControlHelp: "Translation error.", playMultipleModeHelp: "Translation error.", autokillModeHelp: "Translation error.", alertInvalidFile: "Invalid file type.", alertLoadError: "Could not load audio.", alertDecodeError: "Error decoding audio.", alertNoEmptyCells: "No more empty cells.", cellEmptyText: "Click to load sound", cellNoName: "No Name", cellEmptyDefault: "Empty", loopButtonTitle: "Loop (Toggle)"
                },
                it: {
                    title: "Errore di Caricamento", mainTitle: "Errore di Caricamento", volumeLabel: "Volume:", playMultipleLabel: "Errore Trad.", autokillLabel: "Errore Trad.", loadMultipleSoundsButton: "Errore Trad.", stopAllSoundsButton: "Errore Trad.", fadeInLabel: "Fade In:", immediateStart: " (Avvio Immediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Arresto Immediato)", howToUseTitle: "Errore!", dragDropHelp: "Errore di traduzione.", clickHelp: "Errore di traduzione.", shortcutsHelp: "Errore di traduzione.", stopAllHelp: "Errore di traduzione.", volumeHelp: "Errore di traduzione.", deleteSoundHelp: "Errore di traduzione.", replaceSoundHelp: "Errore di traduzione.", renameHelp: "Errore de traduzione.", fadeInHelp: "Errore de traduzione.", fadeOutControlHelp: "Errore de traduzione.", playMultipleModeHelp: "Errore de traduzione.", autokillModeHelp: "Errore de traduzione.", alertInvalidFile: "Invalid file type.", alertLoadError: "Could not load audio.", alertDecodeError: "Error decoding audio.", alertNoEmptyCells: "No more empty cells.", cellEmptyText: "Clicca per caricare il suono", cellNoName: "Senza Nome", cellEmptyDefault: "Vuoto", loopButtonTitle: "Loop (Alterna)"
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
            } catch (error) {
                console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                alert(translations[currentLanguage].alertLoadError.replace('{fileName}', file.name));
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '', isLooping: false }, true);
                soundData[index] = null;
                saveSettings();
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
        } catch (error) {
            console.error('Erro ao decodificar áudio do Data URL:', error);
            alert(translations[currentLanguage].alertDecodeError.replace('{soundName}', name || ''));
            updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: fixedKey || '', isLooping: false }, true);
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
        document.querySelectorAll('.sound-cell.active').forEach(cell => {
            cell.classList.remove('active');
        });

        // MODIFICADO: auto-kill agora aplica-se a todas as instâncias do *último som*, não só a primeira.
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            const lastSound = soundData[lastPlayedSoundIndex];
            if (lastSound) {
                lastSound.activePlayingInstances.forEach(instance => {
                    fadeoutInstance(instance.source, instance.gain, 0.2); // Fade out rápido
                });
                lastSound.activePlayingInstances.clear(); // Limpa as instâncias do som anterior
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
        const playingInstance = { source, gain: gainNode };
        sound.activePlayingInstances.add(playingInstance);
        globalActivePlayingInstances.add(playingInstance);

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('active');
            source.onended = () => {
                // Limpeza da instância apenas se não estiver mais a tocar.
                if (!source.loop) { // Se não estiver em loop, remove no final.
                    setTimeout(() => {
                        sound.activePlayingInstances.delete(playingInstance);
                        globalActivePlayingInstances.delete(playingInstance);
                        source.disconnect();
                        gainNode.disconnect();
                        // Se não houver mais instâncias ativas para este som, remove a classe 'active' da célula
                        if (sound.activePlayingInstances.size === 0) {
                            cell.classList.remove('active');
                        }
                    }, 50);
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

        // NOVO: Coleta todas as instâncias ativas para este som para poder iterar sobre uma cópia
        // e modificar o Set original enquanto itera.
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
        console.log(`Sound ${index} fading out over ${duration} seconds.`);
    }

    // MODIFICADO: A função clearSoundCell agora usa fadeoutSound
    function clearSoundCell(index, fadeDuration = 0.1) {
        const sound = soundData[index];
        if (!sound) {
            return;
        }

        // Primeiro, para todas as instâncias ativas deste som
        fadeoutSound(index, fadeDuration);

        // Em seguida, limpa os dados da célula após um pequeno atraso para o fade
        setTimeout(() => {
            clearSoundData(index); // Isso remove a referência, mas as instâncias já foram desativadas/desconectadas pelo fadeoutSound

            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                // MODIFICADO: O estado inicial de isLooping para células vazias é false
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault, key: defaultKeys[index] || '', isLooping: false }, true);
                cell.classList.remove('active');
            }

            saveSettings();
            if (lastPlayedSoundIndex === index) {
                lastPlayedSoundIndex = null;
            }
            if (currentCueIndex === index) { // NOVO: Se a célula limpa era a cue atual, reseta o cue
                currentCueIndex = -1;
                updateCueHighlight(); // Limpa o destaque da cue
            }
            console.log(`Célula ${index} limpa.`);
        }, fadeDuration * 1000 + 100);
    }

    // MODIFICADO: clearSoundData agora lida com activePlayingInstances
    function clearSoundData(index) {
        const sound = soundData[index];
        if (sound && sound.activePlayingInstances) {
            sound.activePlayingInstances.forEach(instance => {
                try {
                    instance.source.stop(0); // Garante que a fonte pare
                    instance.source.disconnect();
                    instance.gain.disconnect();
                } catch (e) {
                    console.warn("Erro ao desconectar instância de áudio ao limpar dados:", e);
                }
                globalActivePlayingInstances.delete(instance);
            });
            sound.activePlayingInstances.clear();
        }
        soundData[index] = null;
    }

    // NOVO: Função para atualizar o destaque visual da cue list
    function updateCueHighlight() {
        document.querySelectorAll('.sound-cell').forEach((cell, idx) => {
            if (idx === currentCueIndex) {
                cell.classList.add('cue-active'); // Use uma classe diferente para o destaque da cue
            } else {
                cell.classList.remove('cue-active');
            }
        });
    }

    // NOVO: Função para avançar na cue list (GO)
    function goToNextCue(play = true) {
        let originalCueIndex = currentCueIndex;
        let foundSound = false;
        let startIndex = (currentCueIndex === -1) ? 0 : currentCueIndex + 1;

        for (let i = 0; i < NUM_CELLS; i++) {
            let nextIndex = (startIndex + i) % NUM_CELLS;

            if (soundData[nextIndex] && soundData[nextIndex].audioBuffer) {
                currentCueIndex = nextIndex;
                if (play) {
                    playSound(currentCueIndex, true); // O 'true' indica que é uma cue list
                } else {
                    updateCueHighlight(); // Apenas atualiza o destaque, não toca
                }
                foundSound = true;
                break;
            }
        }
        
        if (!foundSound && play) {
            // Se não encontrou nenhum som preenchido para tocar, mas estamos a tentar tocar,
            // poderíamos querer voltar ao -1 ou manter o último cueIndex.
            // Para este cenário, vamos apenas resetar o destaque se não houver mais sons.
            currentCueIndex = -1; // Reset cue se não há sons preenchidos
            updateCueHighlight();
            console.log("Nenhum som encontrado para tocar na cue list.");
        } else if (!foundSound && !play) {
            // Se não encontrou nenhum som preenchido para destacar (mas não para tocar),
            // podemos querer voltar ao -1 para limpar o destaque, ou deixar como está.
            // Vamos resetar para limpar o destaque.
            currentCueIndex = -1;
            updateCueHighlight();
        }
        // Se play for false e foundSound for true, updateCueHighlight já foi chamado.
    }


    // NOVO: Função para retroceder na cue list (GO-)
    function goToPreviousCue(play = true) {
        let originalCueIndex = currentCueIndex;
        let foundSound = false;
        let startIndex = (currentCueIndex === -1 || currentCueIndex === 0) ? (NUM_CELLS - 1) : currentCueIndex - 1;

        for (let i = 0; i < NUM_CELLS; i++) {
            let prevIndex = (startIndex - i + NUM_CELLS) % NUM_CELLS; // Garante que o índice é positivo

            if (soundData[prevIndex] && soundData[prevIndex].audioBuffer) {
                currentCueIndex = prevIndex;
                if (play) {
                    playSound(currentCueIndex, true); // O 'true' indica que é uma cue list
                } else {
                    updateCueHighlight(); // Apenas atualiza o destaque, não toca
                }
                foundSound = true;
                break;
            }
        }
        
        if (!foundSound && play) {
            currentCueIndex = -1;
            updateCueHighlight();
            console.log("Nenhum som encontrado para tocar na cue list.");
        } else if (!foundSound && !play) {
            currentCueIndex = -1;
            updateCueHighlight();
        }
    }


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
        }
        // NOVO: Cue List Navigation
        else if (pressedKey === ' ' && !e.ctrlKey && !e.altKey) { // Tecla SPACE (GO - Próxima Célula Preenchida)
            e.preventDefault();
            goToNextCue(true); // Toca a próxima célula preenchida
        } else if (pressedKey === ' ' && e.ctrlKey && !e.altKey) { // Tecla CTRL + SPACE (GO- - Célula Anterior Preenchida)
            e.preventDefault();
            goToPreviousCue(true); // Toca a célula anterior preenchida
        }
        // NOVO: Navegação visual da cue list sem tocar (Shift + Space, Shift + Ctrl + Space)
        else if (pressedKey === ' ' && e.shiftKey && !e.ctrlKey && !e.altKey) { // Shift + SPACE (próxima cue sem tocar)
            e.preventDefault();
            goToNextCue(false); // Apenas avança o cueIndex e destaca
        }
        else if (pressedKey === ' ' && e.shiftKey && e.ctrlKey && !e.altKey) { // Shift + CTRL + SPACE (anterior cue sem tocar)
            e.preventDefault();
            goToPreviousCue(false); // Apenas recua o cueIndex e destaca
        }
        // FIM DOS NOVOS ATALHOS
        else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault();
            currentFadeInDuration = parseInt(pressedKey);
            updateFadeInDisplay();
            saveSettings();
        } else if (pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault();
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

    // MODIFICADO: stopAllSounds agora itera globalActivePlayingInstances
    function stopAllSounds() {
        if (audioContext) {
            const now = audioContext.currentTime;
            const fadeDuration = 0.2; // Duração do fade out para parar todos os sons

            // Itera sobre uma cópia do Set para permitir modificações durante a iteração
            const instancesToStop = new Set(globalActivePlayingInstances);

            instancesToStop.forEach(instance => {
                // Verifica se a instância é válida, tem um source e se o gain é um GainNode (e não undefined)
                if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') { // Verificação crucial aqui
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
            // NOVO: Remove também a classe 'cue-active' de todas as células
            document.querySelectorAll('.sound-cell.cue-active').forEach(cell => {
                cell.classList.remove('cue-active');
            });


            // Garante que cada som individual limpa suas instâncias ativas
            soundData.forEach(sound => {
                if (sound && sound.activePlayingInstances) {
                    sound.activePlayingInstances.clear();
                }
            });
            lastPlayedSoundIndex = null; // Reseta o último som tocado
            currentCueIndex = -1; // NOVO: Reseta o índice da cue
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
        // NOVO: Após carregar as configurações e o idioma, se houver um lastPlayedSoundIndex,
        // pode-se querer que ele seja o cue inicial para o caso do usuário ter fechado a página
        // e quer continuar de onde parou. Ou, por padrão, comece do zero.
        // Por agora, vou inicializar currentCueIndex para 0 se lastPlayedSoundIndex for null,
        // ou para o lastPlayedSoundIndex se existir, para que o primeiro GO avance a partir daí.
        if (lastPlayedSoundIndex !== null) {
             currentCueIndex = lastPlayedSoundIndex;
             updateCueHighlight();
        } else {
            // Se não há último som tocado, defina o cue inicial para a primeira célula preenchida
            // ou 0 se nenhuma estiver preenchida.
            let firstPopulatedIndex = -1;
            for(let i = 0; i < NUM_CELLS; i++) {
                if (soundData[i] && soundData[i].audioBuffer) {
                    firstPopulatedIndex = i;
                    break;
                }
            }
            currentCueIndex = (firstPopulatedIndex !== -1) ? firstPopulatedIndex : -1;
            updateCueHighlight(); // Exibe o primeiro cue ativo (ou nenhum se todas vazias)
        }
    });

    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
