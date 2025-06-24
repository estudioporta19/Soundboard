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

    let audioContext;
    const soundData = []; // { name, key, audioBuffer, audioDataUrl, activeGainNodes: Set, color }
    const globalActiveGainNodes = new Set();
    let lastPlayedSoundIndex = null;

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

    // Carregar configurações do localStorage
    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        
        volumeRange.value = savedSettings.volume !== undefined ? savedSettings.volume : 0.75;
        playMultipleCheckbox.checked = savedSettings.playMultiple !== undefined ? savedSettings.playMultiple : false;
        autokillModeCheckbox.checked = savedSettings.autokillMode !== undefined ? savedSettings.autokillMode : false;
        
        updateVolumeDisplay();

        // Recria as células com base no NUM_CELLS e defaultKeys
        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i); // Cria a célula e adiciona à linha QWERTY correta
            
            // A tecla padrão para esta célula, que agora é fixa
            const fixedKey = defaultKeys[i];

            if (cellData && cellData.audioDataUrl) {
                const color = cellData.color || getRandomHSLColor();
                // A tecla é sempre a defaultKey para esta posição
                loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, fixedKey, color);
            } else {
                cell.style.backgroundColor = getRandomHSLColor();
                updateCellDisplay(cell, { name: 'Vazio', key: fixedKey || '' }, true);
            }
        }
    }

    // Guardar configurações no localStorage
    function saveSettings() {
        const settingsToSave = {
            volume: parseFloat(volumeRange.value),
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null, // A tecla é sempre a defaultKey aqui
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

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '❌'; // O ícone de cruz continua sendo a principal ação
        deleteButton.title = 'Clique para apagar o som (fade out rápido ao segurar)';
        cell.appendChild(deleteButton);

        const nameDisplay = document.createElement('div');
        nameDisplay.classList.add('sound-name');
        nameDisplay.contentEditable = true;
        nameDisplay.spellcheck = false;
        nameDisplay.textContent = 'Vazio';
        nameDisplay.title = 'Clique para editar o nome';
        cell.appendChild(nameDisplay);

        // Novo elemento para exibir a tecla no rodapé da célula
        const keyDisplayBottom = document.createElement('div');
        keyDisplayBottom.classList.add('key-display-bottom');
        keyDisplayBottom.textContent = defaultKeys[index] ? defaultKeys[index].toUpperCase() : '';
        cell.appendChild(keyDisplayBottom);

        // Adiciona a célula à linha QWERTY correta
        if (index >= 0 && index < 10) { // Q-P
            rowTop.appendChild(cell);
        } else if (index >= 10 && index < 19) { // A-L
            rowHome.appendChild(cell);
        } else if (index >= 19 && index < 26) { // Z-M
            rowBottom.appendChild(cell);
        } else {
            console.warn(`Índice de célula fora do esperado: ${index}`);
            soundboardGrid.appendChild(cell); // Fallback
        }

        setupCellEvents(cell, index); 

        soundData[index] = null; // Inicializa com null para poder carregar depois

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
                alert('Por favor, arraste um ficheiro de áudio válido (MP3, WAV, OGG).');
            }
        });

        // Click para tocar ou carregar som
        cell.addEventListener('click', (e) => {
            // Se o clique foi no botão de apagar ou no nome, não faz nada (a não ser que seja para editar)
            if (e.target.closest('.delete-button') || e.target.closest('.sound-name')) {
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
                soundData[index].name = nameDisplay.textContent.trim() || 'Sem Nome';
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
                // Ação de fade out (clique longo)
                if (soundData[index] && soundData[index].audioBuffer) {
                    fadeoutSound(index, 5); // 5 segundos de fade out
                }
            }, longPressDuration);
        });

        deleteButton.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            clearTimeout(pressTimer);
            // Ação de apagar (clique curto, se o timer não foi concluído)
            if (e.button === 0 && !cell.classList.contains('empty')) { // Apenas para clique esquerdo e se não estiver vazia
                 // Se o timer não terminou, significa que foi um clique curto
                if (Date.now() - e.timeStamp < longPressDuration) { // Comparar o tempo do evento
                    clearSoundCell(index, 0.1); // Fade out super rápido ao apagar (0.1s)
                }
            }
        });

        deleteButton.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer); // Cancela o timer se o mouse sair do botão
        });

        // Previne o menu de contexto do clique direito no botão de apagar
        deleteButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    // Carrega um ficheiro de áudio numa célula específica
    async function loadFileIntoCell(file, cell, index, nameOverride = null) {
        initAudioContext();

        const reader = new FileReader();
        reader.onload = async (e) => {
            const audioDataUrl = e.target.result;
            const arrayBuffer = e.target.result;

            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const defaultName = nameOverride || file.name.replace(/\.[^/.]+$/, "");
                const fixedKey = defaultKeys[index]; // A tecla é sempre a pré-definida para esta posição

                const cellColor = getRandomHSLColor();
                cell.style.backgroundColor = cellColor; 

                // Limpa qualquer som existente nesta célula antes de carregar um novo
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
                alert(`Não foi possível carregar o áudio "${file.name}". Verifique o formato do ficheiro e se não está corrompido.`);
                updateCellDisplay(cell, { name: 'Vazio', key: defaultKeys[index] || '' }, true);
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
            
            // A tecla é sempre a defaultKey, mesmo se o localStorage tiver algo diferente
            const fixedKey = defaultKeys[index];

            soundData[index] = {
                name: name || 'Sem Nome',
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
            alert(`Erro ao carregar o som "${name}". Pode estar corrompido.`);
            updateCellDisplay(cell, { name: 'Vazio', key: defaultKeys[index] || '' }, true);
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

        if (isEmpty) {
            cell.classList.add('empty');
            nameDisplay.textContent = 'Vazio';
            nameDisplay.contentEditable = false;
            deleteButton.style.display = 'none'; // Esconde o botão de apagar
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || 'Sem Nome';
            nameDisplay.contentEditable = true;
            deleteButton.style.display = 'flex'; // Mostra o botão de apagar
        }
        // A tecla sempre será a defaultKey para a posição da célula
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
            if (lastCell) lastCell.classList.remove('active'); // Remove a classe 'active' da célula anterior
            fadeoutSound(lastPlayedSoundIndex, 0.2); 
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
            cell.classList.add('active'); // Adiciona a classe 'active' ao começar a tocar
            source.onended = () => {
                // Atraso curto para que o efeito visual seja visível por mais tempo
                setTimeout(() => {
                    cell.classList.remove('active'); // Remove a classe 'active' ao terminar
                    sound.activeGainNodes.delete(gainNode);
                    globalActiveGainNodes.delete(gainNode);
                    source.disconnect();
                    gainNode.disconnect();
                }, 50); // Pequeno atraso (ex: 50ms)
            };
        }

        if (playMultipleCheckbox.checked) {
            source.start(0);
        } else {
            // No modo de reprodução única, interrompe outros sons *desta mesma célula*
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
            sound.activeGainNodes.clear(); // Limpa, pois só queremos 1 ativo por célula neste modo
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
            cell.classList.remove('active'); // Remove a classe active também no fade out
        }
    }

    function clearSoundCell(index, fadeDuration = 0.1) { // Fade out padrão mais rápido para apagar
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
                updateCellDisplay(cell, { name: 'Vazio', key: defaultKeys[index] || '' }, true); 
                cell.style.backgroundColor = getRandomHSLColor(); 
                cell.classList.remove('active'); // Garante que a classe 'active' é removida
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

        // Ignorar eventos de teclado se o foco estiver em um campo editável
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
        } else {
            // Procura o índice da tecla pressionada no array defaultKeys
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
            
            // Remove a classe 'active' de todas as células
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
                    if (soundData[i] === null || soundData[i].audioBuffer === null) {
                        const cell = document.querySelector(`.sound-cell[data-index="${i}"]`); 
                        await loadFileIntoCell(file, cell, i); 
                        startIndex = i + 1;
                        foundEmptyCell = true;
                        break;
                    }
                }
                if (!foundEmptyCell) {
                    alert(`Não há mais células vazias para carregar "${file.name}".`);
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
