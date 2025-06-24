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

    let usedKeys = new Set(); // Para controlar as teclas já atribuídas

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

        usedKeys.clear(); // Limpa as teclas usadas antes de carregar
        
        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i); // Cria a célula e adiciona à linha QWERTY correta
            
            // Atribui a tecla QWERTY padrão à célula, mesmo que vazia
            const defaultKeyForCell = defaultKeys[i];
            if (defaultKeyForCell) {
                usedKeys.add(defaultKeyForCell); // Marca como usada, para que não seja atribuída a outra célula
            }

            if (cellData && cellData.audioDataUrl) {
                const color = cellData.color || getRandomHSLColor();
                const assignedKey = cellData.key || defaultKeyForCell || ''; // Prioriza salvo, depois default, depois vazio

                // Se a tecla atribuída (salva ou padrão) já estava em uso por outra célula, tenta encontrar uma livre
                if (usedKeys.has(assignedKey) && soundData.some((s, idx) => s && s.key === assignedKey && idx !== i)) {
                     // Isso é mais complexo: se a tecla salva já está em uso por outra célula, precisamos de lidar com isso.
                     // Por agora, vamos permitir que o usedKeys capture o que foi salvo, e o assignKeyToCell gerirá conflitos manuais.
                     // Para carregamento automático, mantemos a tecla salva.
                } else if (assignedKey) {
                    usedKeys.add(assignedKey);
                }

                loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, assignedKey, color);
            } else {
                cell.style.backgroundColor = getRandomHSLColor();
                updateCellDisplay(cell, { name: 'Vazio', key: defaultKeyForCell || '' }, true);
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
                key: data ? data.key : null,
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
        deleteButton.textContent = '❌';
        deleteButton.title = 'Apagar este som (fade out rápido)';
        cell.appendChild(deleteButton);

        const nameDisplay = document.createElement('div');
        nameDisplay.classList.add('sound-name');
        nameDisplay.contentEditable = true;
        nameDisplay.spellcheck = false;
        nameDisplay.textContent = 'Vazio';
        nameDisplay.title = 'Clique para editar o nome';
        cell.appendChild(nameDisplay);

        const cellActions = document.createElement('div');
        cellActions.classList.add('cell-actions');
        cell.appendChild(cellActions);

        const keyInfo = document.createElement('div');
        keyInfo.classList.add('key-info');
        // A tecla será atualizada no updateCellDisplay, mas podemos dar um placeholder
        keyInfo.innerHTML = '<span class="key-icon">⌨️</span> <span class="key-display"></span>';
        keyInfo.title = 'Clique para atribuir uma tecla';
        cellActions.appendChild(keyInfo);

        const fadeoutButton = document.createElement('div');
        fadeoutButton.classList.add('fadeout-button');
        fadeoutButton.textContent = '🔽';
        fadeoutButton.title = 'Fade Out (5s)';
        cellActions.appendChild(fadeoutButton);

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
        const existingOverlay = cell.querySelector('.key-assign-overlay');
        if (existingOverlay) {
            cell.removeChild(existingOverlay);
        }

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

        cell.addEventListener('click', (e) => {
            if (e.target.closest('.delete-button') || 
                e.target.closest('.fadeout-button') || 
                e.target.closest('.sound-name') || 
                e.target.closest('.key-info') || 
                cell.querySelector('.key-assign-overlay')) {
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

        const keyInfo = cell.querySelector('.key-info');
        keyInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            assignKeyToCell(cell, index);
        });

        const deleteButton = cell.querySelector('.delete-button');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            clearSoundCell(index, 0.3);
        });

        const fadeoutButton = cell.querySelector('.fadeout-button');
        fadeoutButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (soundData[index] && soundData[index].audioBuffer) {
                fadeoutSound(index, 5); 
            }
        });
    }

    // Carrega um ficheiro de áudio numa célula específica
    async function loadFileIntoCell(file, cell, index, nameOverride = null, keyOverride = null) {
        initAudioContext();

        const reader = new FileReader();
        reader.onload = async (e) => {
            const audioDataUrl = e.target.result;
            const arrayBuffer = e.target.result;

            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const defaultName = nameOverride || file.name.replace(/\.[^/.]+$/, "");
                
                // Lógica de atribuição de tecla
                let assignedKey = keyOverride; // Se veio com override, usa.
                if (!assignedKey) {
                    // Se não tem override, tenta usar a tecla QWERTY correspondente ao índice
                    const defaultKeyCandidate = defaultKeys[index];
                    if (defaultKeyCandidate && !usedKeys.has(defaultKeyCandidate)) {
                        assignedKey = defaultKeyCandidate;
                    } else if (defaultKeyCandidate && usedKeys.has(defaultKeyCandidate) && (soundData[index] && soundData[index].key === defaultKeyCandidate)) {
                         // A tecla QWERTY já está atribuída a ESTA CÉLULA (ex: recarregando o mesmo som)
                         assignedKey = defaultKeyCandidate;
                    } else {
                        // Se a tecla QWERTY para este índice já estiver em uso por OUTRA CÉLULA, procura a próxima livre
                        let foundAvailableKey = false;
                        for(let k = 0; k < defaultKeys.length; k++) {
                            const potentialKey = defaultKeys[k];
                            // Verifica se a potentialKey NÃO ESTÁ usada OU se está usada por ESTA célula
                            if (!usedKeys.has(potentialKey) || (soundData[index] && soundData[index].key === potentialKey)) {
                                assignedKey = potentialKey;
                                foundAvailableKey = true;
                                break;
                            }
                        }
                        if (!foundAvailableKey) {
                            console.warn("Todas as teclas padrão estão em uso. Nenhuma tecla atribuída automaticamente para a célula " + index);
                        }
                    }
                }
                
                // Antes de atribuir, remove a tecla anterior (se houver) de 'usedKeys'
                if (soundData[index] && soundData[index].key && soundData[index].key !== assignedKey) {
                    usedKeys.delete(soundData[index].key);
                }
                if (assignedKey) {
                    usedKeys.add(assignedKey); // Adiciona a nova tecla (ou a já existente para esta célula)
                }


                const cellColor = getRandomHSLColor();
                cell.style.backgroundColor = cellColor; 

                // Clear any existing sound in this cell before loading new one
                if (soundData[index]) {
                    clearSoundData(index);
                }
                
                soundData[index] = {
                    name: defaultName,
                    key: assignedKey || '', 
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
                // Se falhar, volta a exibir a tecla QWERTY original da célula
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
            
            // Garantir que a tecla carregada do localStorage é considerada "usada"
            if (key) {
                 usedKeys.add(key);
            }
            
            soundData[index] = {
                name: name || 'Sem Nome',
                key: key || '',
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
            // Se falhar, volta a exibir a tecla QWERTY original da célula
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
        const keyDisplay = cell.querySelector('.key-display');
        const deleteButton = cell.querySelector('.delete-button');
        const keyInfo = cell.querySelector('.key-info');
        const fadeoutButton = cell.querySelector('.fadeout-button');

        if (isEmpty) {
            cell.classList.add('empty');
            nameDisplay.textContent = 'Vazio';
            nameDisplay.contentEditable = false;

            keyDisplay.textContent = data.key ? data.key.toUpperCase() : 'Sem Tecla'; // Mostra a tecla QWERTY
            keyInfo.style.display = 'flex'; // Mantém o atalho de teclado visível
            
            deleteButton.style.display = 'none'; 
            fadeoutButton.style.display = 'none'; 
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || 'Sem Nome';
            nameDisplay.contentEditable = true;

            keyDisplay.textContent = data.key ? data.key.toUpperCase() : 'Sem Tecla';
            keyInfo.style.display = 'flex';

            deleteButton.style.display = 'flex'; 
            fadeoutButton.style.display = 'flex'; 
        }
    }

    // Reproduz um som
    function playSound(index) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext();

        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
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

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`); // Busca a célula pelo data-index
        if (cell) {
            cell.classList.add('active');
            source.onended = () => {
                cell.classList.remove('active');
                sound.activeGainNodes.delete(gainNode);
                globalActiveGainNodes.delete(gainNode);
                source.disconnect();
                gainNode.disconnect();
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
    }

    function clearSoundCell(index, fadeDuration = 0.3) {
        const sound = soundData[index];
        if (!sound) { 
            return;
        }

        initAudioContext(); 

        fadeoutSound(index, fadeDuration); 

        setTimeout(() => {
            // Remove a tecla da célula que está a ser limpa do conjunto de usedKeys
            if (soundData[index] && soundData[index].key) {
                usedKeys.delete(soundData[index].key);
            }

            clearSoundData(index); 

            // Precisamos encontrar a célula pelo data-index, pois ela não está mais no children direto de soundboardGrid
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                updateCellDisplay(cell, { name: 'Vazio', key: defaultKeys[index] || '' }, true); 
                cell.style.backgroundColor = getRandomHSLColor(); 
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

    function assignKeyToCell(cell, index) {
        const existingOverlay = cell.querySelector('.key-assign-overlay');
        if (existingOverlay) return;

        const overlay = document.createElement('div');
        overlay.classList.add('key-assign-overlay');
        overlay.innerHTML = '<p>Pressione uma tecla para atribuir</p><span id="assigned-key-display">...</span>';
        cell.appendChild(overlay);

        const assignedKeyDisplay = overlay.querySelector('#assigned-key-display');

        const keyListener = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const pressedKey = e.key.toLowerCase();

            if (['escape', 'alt', 'control', 'shift', 'tab', 'capslock', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'meta'].includes(pressedKey)) { 
                assignedKeyDisplay.textContent = 'Inválido!';
                setTimeout(() => assignedKeyDisplay.textContent = '...', 800);
                return;
            }

            // Verifica se a nova tecla já está em uso por OUTRA célula
            const isKeyTakenByOtherCell = soundData.some((s, i) => s && s.key === pressedKey && i !== index);

            if (isKeyTakenByOtherCell) {
                assignedKeyDisplay.textContent = 'Já em uso!';
                setTimeout(() => assignedKeyDisplay.textContent = '...', 800);
                return;
            }
            
            // Remove a tecla antiga do set de usadas, se houver
            if (soundData[index] && soundData[index].key) {
                usedKeys.delete(soundData[index].key);
            }

            if (pressedKey === 'backspace' || pressedKey === 'delete') {
                if (soundData[index]) {
                    soundData[index].key = '';
                }
                const keyDisplay = cell.querySelector('.key-display');
                keyDisplay.textContent = 'Sem Tecla'; 
            } else {
                if (soundData[index]) {
                    soundData[index].key = pressedKey;
                    usedKeys.add(pressedKey); // Adiciona a nova tecla ao set de usadas
                }
                const keyDisplay = cell.querySelector('.key-display');
                keyDisplay.textContent = pressedKey.toUpperCase();
            }

            saveSettings();
            cell.removeChild(overlay);
            document.removeEventListener('keydown', keyListener);
        };

        document.addEventListener('keydown', keyListener, { once: true });

        const clickOutsideListener = (e) => {
            if (!overlay.contains(e.target)) {
                cell.removeChild(overlay);
                document.removeEventListener('keydown', keyListener);
                document.removeEventListener('click', clickOutsideListener);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', clickOutsideListener);
        }, 100);
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
        } else {
            const soundToPlay = soundData.find(s => s && s.key === pressedKey);
            if (soundToPlay) {
                const index = soundData.indexOf(soundToPlay);
                playSound(index);
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
                        // Ao carregar múltiplos, passamos o keyOverride como null para que a lógica de assignedKey em loadFileIntoCell
                        // tente usar a tecla QWERTY predefinida para aquele índice, ou a próxima disponível.
                        const cell = document.querySelector(`.sound-cell[data-index="${i}"]`); 
                        await loadFileIntoCell(file, cell, i, null, null); 
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
