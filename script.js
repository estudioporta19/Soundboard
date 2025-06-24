document.addEventListener('DOMContentLoaded', () => {
    const soundboardGrid = document.getElementById('soundboard-grid');
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const autokillModeCheckbox = document.getElementById('autokill-mode'); // Nova checkbox
    const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');

    const NUM_CELLS = 12;
    let audioContext;
    const soundData = []; // { name, key, audioBuffer, audioDataUrl, activeGainNodes: Set }
    const globalActiveGainNodes = new Set(); // Para controlar todos os sons a tocar globalmente
    let lastPlayedSoundIndex = null; // Para o modo Autokill

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
        autokillModeCheckbox.checked = savedSettings.autokillMode !== undefined ? savedSettings.autokillMode : false; // Carrega estado do autokill
        
        updateVolumeDisplay();

        for (let i = 0; i < NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = createSoundCell(i);
            if (cellData && cellData.audioDataUrl) {
                loadSoundFromDataURL(cellData.audioDataUrl, cell, i, cellData.name, cellData.key);
            } else {
                updateCellDisplay(cell, { name: 'Vazio', key: '' }, true);
            }
        }
    }

    // Guardar configurações no localStorage
    function saveSettings() {
        const settingsToSave = {
            volume: parseFloat(volumeRange.value),
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked, // Guarda estado do autokill
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null,
                audioDataUrl: data ? data.audioDataUrl : null
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

        // Novo botão de Fade Out de 5 segundos
        const fadeoutButton = document.createElement('div');
        fadeoutButton.classList.add('fadeout-button');
        fadeoutButton.textContent = '🔽'; // Um ícone para fade out
        fadeoutButton.title = 'Fade Out (5s)';
        cellActions.appendChild(fadeoutButton);

        soundboardGrid.appendChild(cell);

        setupCellEvents(cell, index);

        soundData[index] = null;

        return cell;
    }

    // Configura os eventos para uma célula
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
                alert('Por favor, arraste um ficheiro de áudio válido (MP3, WAV, OGG).');
            }
        });

        // Click para tocar ou carregar som
        cell.addEventListener('click', (e) => {
            // Verifica se o clique não foi nos botões de controlo da célula ou overlay
            if (e.target.closest('.delete-button') || 
                e.target.closest('.fadeout-button') || // Novo botão fadeout
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

        // Edição de nome
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

        // Atribuição de tecla
        const keyInfo = cell.querySelector('.key-info');
        keyInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            assignKeyToCell(cell, index);
        });

        // Apagar som (botão ❌)
        const deleteButton = cell.querySelector('.delete-button');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            clearSoundCell(index, 0.3); // Fade out rápido ao apagar (0.3s)
        });

        // Novo: Fade Out de 5 segundos (botão 🔽)
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
                const key = keyOverride !== null ? keyOverride : (soundData[index] ? soundData[index].key : '');
                
                // Limpa quaisquer sons existentes nesta célula antes de carregar um novo
                if (soundData[index]) {
                    clearSoundData(index);
                }

                soundData[index] = {
                    name: defaultName,
                    key: key,
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl,
                    activeGainNodes: new Set()
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
    async function loadSoundFromDataURL(dataUrl, cell, index, name, key) {
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
                activeGainNodes: new Set()
            };
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
        const keyInfo = cell.querySelector('.key-info'); // Para mostrar/esconder
        const fadeoutButton = cell.querySelector('.fadeout-button'); // Para mostrar/esconder

        if (isEmpty) {
            cell.classList.add('empty');
            nameDisplay.textContent = 'Vazio';
            keyDisplay.textContent = 'Sem Tecla';
            deleteButton.style.display = 'none';
            fadeoutButton.style.display = 'none'; // Esconde o botão fadeout
            nameDisplay.contentEditable = false;
            keyInfo.style.display = 'none'; 
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || 'Sem Nome';
            keyDisplay.textContent = data.key ? data.key.toUpperCase() : 'Sem Tecla';
            deleteButton.style.display = 'flex';
            fadeoutButton.style.display = 'flex'; // Mostra o botão fadeout
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

        // Lógica Autokill: Se ativado e um som anterior foi tocado, para-o
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            fadeoutSound(lastPlayedSoundIndex, 0.2); // Fade out rápido do som anterior (0.2s)
        }

        // Se o contexto de áudio estiver suspenso (por exemplo, após inatividade do utilizador), tente retomá-lo.
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
                playActualSound(sound, index);
                lastPlayedSoundIndex = index; // Atualiza o último som tocado APENAS se iniciar
            }).catch(e => console.error('Erro ao retomar AudioContext:', e));
        } else {
            playActualSound(sound, index);
            lastPlayedSoundIndex = index; // Atualiza o último som tocado
        }
    }

    function playActualSound(sound, index) {
        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;

        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.masterGainNode);
        source.connect(gainNode);

        // Adiciona a referência do GainNode às listas de controlo
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
            // Se não for para reproduzir múltiplas vezes, para todas as instâncias anteriores deste som
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

    // Função para aplicar fade out a um som de uma célula específica
    function fadeoutSound(index, duration) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext();
        const now = audioContext.currentTime;

        sound.activeGainNodes.forEach(gainNode => {
            gainNode.gain.cancelScheduledValues(now); // Limpa agendamentos anteriores
            gainNode.gain.setValueAtTime(gainNode.gain.value, now); // Define o valor inicial para o fade
            gainNode.gain.linearRampToValueAtTime(0.001, now + duration); // Fade out para quase zero
            
            setTimeout(() => {
                if (gainNode) {
                    gainNode.disconnect();
                    globalActiveGainNodes.delete(gainNode);
                }
            }, duration * 1000 + 50); // Atraso para garantir o fim do fade
        });
        sound.activeGainNodes.clear(); // Limpa as referências ativas para este som
    }

    // Apaga um som da célula com um fade out opcional
    function clearSoundCell(index, fadeDuration = 0.3) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext(); // Garante o contexto

        fadeoutSound(index, fadeDuration); // Usa a nova função de fade out

        // Após o fade out (ou imediatamente se duration for 0), limpa os dados da célula
        setTimeout(() => {
            clearSoundData(index);
            const cell = soundboardGrid.children[index];
            updateCellDisplay(cell, { name: 'Vazio', key: '' }, true);
            saveSettings();
            if (lastPlayedSoundIndex === index) { // Se a célula apagada era a última tocada no modo autokill
                lastPlayedSoundIndex = null;
            }
        }, fadeDuration * 1000 + 100); // Um pouco mais de atraso para garantir o fade
    }


    // Função auxiliar para limpar dados de som de uma célula e parar instâncias
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

    // Atribui uma tecla a uma célula
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

            if (pressedKey === 'backspace' || pressedKey === 'delete') {
                if (soundData[index]) {
                    soundData[index].key = '';
                }
                const keyDisplay = cell.querySelector('.key-display');
                keyDisplay.textContent = 'Sem Tecla';
            } else {
                if (soundData[index]) {
                    soundData[index].key = pressedKey;
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

    // Evento para a checkbox de reproduzir múltiplas vezes
    playMultipleCheckbox.addEventListener('change', () => {
        saveSettings();
    });

    // Novo: Evento para a checkbox do modo Autokill
    autokillModeCheckbox.addEventListener('change', () => {
        saveSettings();
    });

    // Parar todos os sons (global)
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
            
            // Limpar também as referências nas células
            soundData.forEach(sound => {
                if (sound && sound.activeGainNodes) {
                    sound.activeGainNodes.clear();
                }
            });
            lastPlayedSoundIndex = null; // Reseta o último som tocado no modo autokill
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
    for (let i = 0; i < NUM_CELLS; i++) {
        createSoundCell(i);
    }
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
