document.addEventListener('DOMContentLoaded', () => {
    const soundboardGrid = document.getElementById('soundboard-grid');
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const autokillModeCheckbox = document.getElementById('autokill-mode');
    const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');

    const NUM_CELLS = 12;
    let audioContext;
    const soundData = []; // { name, key, audioBuffer, audioDataUrl, activeGainNodes: Set, color }
    const globalActiveGainNodes = new Set();
    let lastPlayedSoundIndex = null;

    // Caracteres para atribuição automática de teclas
    const defaultKeys = 'qwertyuiopasdfghjklzxcvbnm'.split('');
    let usedKeys = new Set(); // Para controlar as teclas já atribuídas

    // Função para gerar uma cor de fundo aleatória e garantir que seja visível no localStorage
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
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
        let defaultKeyIndex = 0;

        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i);
            
            if (cellData && cellData.audioDataUrl) {
                // Se a cor já existe, usa-a; senão, gera uma nova
                const color = cellData.color || getRandomColor();
                cell.style.backgroundColor = color; // Aplica a cor de fundo
                
                // Atribui uma tecla padrão se não houver uma salva ou se a salva estiver vazia, e não estiver em uso
                let assignedKey = cellData.key || '';
                if (!assignedKey && defaultKeyIndex < defaultKeys.length) {
                    let nextKey = defaultKeys[defaultKeyIndex];
                    // Procura a próxima tecla disponível
                    while (usedKeys.has(nextKey) && defaultKeyIndex < defaultKeys.length) {
                        defaultKeyIndex++;
                        nextKey = defaultKeys[defaultKeyIndex];
                    }
                    if (nextKey && !usedKeys.has(nextKey)) {
                        assignedKey = nextKey;
                        usedKeys.add(assignedKey);
                        defaultKeyIndex++;
                    }
                } else if (assignedKey) {
                    usedKeys.add(assignedKey); // Adiciona a tecla salva às usadas
                }

                loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, assignedKey, color);
            } else {
                cell.style.backgroundColor = getRandomColor(); // Células vazias também têm cor
                updateCellDisplay(cell, { name: 'Vazio', key: '' }, true);
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
                color: data ? data.color : null // Guarda a cor da célula
            }))
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
    }

    // Cria e adiciona uma célula da soundboard
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
        keyInfo.innerHTML = '<span class="key-icon">⌨️</span> <span class="key-display">Sem Tecla</span>';
        keyInfo.title = 'Clique para atribuir uma tecla';
        cellActions.appendChild(keyInfo);

        const fadeoutButton = document.createElement('div');
        fadeoutButton.classList.add('fadeout-button');
        fadeoutButton.textContent = '🔽';
        fadeoutButton.title = 'Fade Out (5s)';
        cellActions.appendChild(fadeoutButton);

        soundboardGrid.appendChild(cell);

        setupCellEvents(cell, index); // Assegura que os eventos são configurados para cada nova célula

        soundData[index] = null;

        return cell;
    }

    // Configura os eventos para uma célula
    function setupCellEvents(cell, index) {
        // Remove listeners existentes para evitar duplicação (importante para o bug do '❌')
        // Embora não esteja a remover os eventos da célula, mas sim a reassociá-los,
        // o problema do '❌' pode ser mais relacionado com a forma como os elementos DOM são geridos.
        // O código anterior já fazia a reatribuição, o problema pode estar noutro lugar,
        // mas vale a pena garantir que não há conflitos.

        // Limpar listeners antigos antes de adicionar novos (se a célula for reutilizada)
        const oldCell = soundboardGrid.children[index];
        if (oldCell) {
            // Clonar e substituir para remover todos os event listeners de uma vez
            const newCell = oldCell.cloneNode(true);
            soundboardGrid.replaceChild(newCell, oldCell);
            cell = newCell; // Atualiza a referência 'cell' para a nova célula clonada
        }

        // AGORA, adiciona os listeners à célula (ou à sua versão clonada)
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
            clearSoundCell(index, 0.3); // Fade out rápido ao apagar (0.3s)
        });

        const fadeoutButton = cell.querySelector('.fadeout-button');
        fadeoutButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (soundData[index] && soundData[index].audioBuffer) {
                fadeoutSound(index, 5); // 5 segundos de fade out
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
                
                // Lógica de atribuição de tecla padrão
                let assignedKey = keyOverride;
                if (!assignedKey) { // Se não foi sobrescrito, tenta atribuir uma padrão
                    let foundDefaultKey = false;
                    for(let i = 0; i < defaultKeys.length; i++) {
                        const potentialKey = defaultKeys[i];
                        if (!usedKeys.has(potentialKey)) {
                            assignedKey = potentialKey;
                            usedKeys.add(assignedKey);
                            foundDefaultKey = true;
                            break;
                        }
                    }
                    if (!foundDefaultKey) {
                        console.warn("Todas as teclas padrão estão em uso. Nenhuma tecla atribuída automaticamente.");
                    }
                } else {
                    usedKeys.add(assignedKey); // Se veio com um keyOverride, adiciona aos usados
                }

                // Gerar uma nova cor para o botão ao carregar um novo som
                const cellColor = getRandomColor();
                cell.style.backgroundColor = cellColor; // Aplica a cor de fundo

                // Clear any existing sound in this cell before loading new one
                if (soundData[index]) {
                    clearSoundData(index);
                    // Se havia uma tecla atribuída, remove-a do set de usadas
                    if (soundData[index].key) {
                        usedKeys.delete(soundData[index].key);
                    }
                }
                
                soundData[index] = {
                    name: defaultName,
                    key: assignedKey || '', // Garante que a chave é uma string vazia se não for atribuída
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl,
                    activeGainNodes: new Set(),
                    color: cellColor // Guarda a cor gerada
                };
                updateCellDisplay(cell, soundData[index], false);
                saveSettings();
            } catch (error) {
                console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                alert(`Não foi possível carregar o áudio "${file.name}". Verifique o formato do ficheiro e se não está corrompido.`);
                updateCellDisplay(cell, { name: 'Vazio', key: '' }, true);
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
            
            soundData[index] = {
                name: name || 'Sem Nome',
                key: key || '',
                audioBuffer: audioBuffer,
                audioDataUrl: dataUrl,
                activeGainNodes: new Set(),
                color: color // Usa a cor carregada do localStorage
            };
            cell.style.backgroundColor = color; // Aplica a cor
            updateCellDisplay(cell, soundData[index], false);
        } catch (error) {
            console.error('Erro ao decodificar áudio do Data URL:', error);
            alert(`Erro ao carregar o som "${name}". Pode estar corrompido.`);
            updateCellDisplay(cell, { name: 'Vazio', key: '' }, true);
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
            keyDisplay.textContent = 'Sem Tecla';
            deleteButton.style.display = 'none';
            fadeoutButton.style.display = 'none';
            nameDisplay.contentEditable = false;
            keyInfo.style.display = 'none'; 
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || 'Sem Nome';
            keyDisplay.textContent = data.key ? data.key.toUpperCase() : 'Sem Tecla';
            deleteButton.style.display = 'flex';
            fadeoutButton.style.display = 'flex';
            nameDisplay.contentEditable = true;
            keyInfo.style.display = 'flex';
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
            fadeoutSound(lastPlayedSoundIndex, 0.2); // Fade out rápido do som anterior (0.2s)
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

        const cell = soundboardGrid.children[index];
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
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext();

        fadeoutSound(index, fadeDuration);

        setTimeout(() => {
            // Se a célula tinha uma tecla atribuída, remove-a de usedKeys
            if (soundData[index] && soundData[index].key) {
                usedKeys.delete(soundData[index].key);
            }

            clearSoundData(index);
            const cell = soundboardGrid.children[index];
            updateCellDisplay(cell, { name: 'Vazio', key: '' }, true);
            
            // Atribui uma nova cor aleatória à célula vazia
            cell.style.backgroundColor = getRandomColor(); 

            saveSettings();
            if (lastPlayedSoundIndex === index) {
                lastPlayedSoundIndex = null;
            }
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

            if (['escape', 'alt', 'control', 'shift', 'tab', 'capslock', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'].includes(pressedKey)) {
                assignedKeyDisplay.textContent = 'Inválido!';
                setTimeout(() => assignedKeyDisplay.textContent = '...', 800);
                return;
            }

            const isKeyTaken = soundData.some((s, i) => s && s.key === pressedKey && i !== index);

            if (isKeyTaken) {
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
                        const cell = soundboardGrid.children[i];
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

    // Inicialização: criar células e carregar configurações
    // Criamos as células aqui para garantir que todas existem antes de carregar settings
    // A função setupCellEvents é chamada dentro de createSoundCell
    for (let i = 0; i < NUM_CELLS; i++) {
        const cell = document.createElement('div');
        cell.classList.add('sound-cell');
        cell.dataset.index = i;
        soundboardGrid.appendChild(cell); // Adiciona ao DOM temporariamente
        // O conteúdo e os event listeners serão adicionados/reconfigurados no loadSettings
    }
    loadSettings(); // Isso vai preencher e configurar as células existentes no DOM

    // Workaround para o Chrome: AudioContext precisa de uma interação do utilizador
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
