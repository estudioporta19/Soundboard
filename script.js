document.addEventListener('DOMContentLoaded', () => {
    const soundboardGrid = document.getElementById('soundboard-grid');
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general'); // Botão geral

    const NUM_CELLS = 12; // Número de células na soundboard
    let audioContext;
    const soundData = []; // Armazena info do som: { name, key, audioBuffer, audioDataUrl, currentSources: Set }
    const activeSounds = new Set(); // Para controlar instâncias de sons a tocar globalmente

    // Inicializa o AudioContext
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Conecta o GainNode (para controle de volume) ao destino
            const gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = volumeRange.value; // Define o volume inicial
            audioContext.masterGainNode = gainNode; // Armazena para acesso fácil
        }
    }

    // Carregar configurações do localStorage
    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        
        volumeRange.value = savedSettings.volume !== undefined ? savedSettings.volume : 0.75;
        playMultipleCheckbox.checked = savedSettings.playMultiple !== undefined ? savedSettings.playMultiple : false;
        
        updateVolumeDisplay();

        // Regenerar células e carregar sons
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

        // Botão de apagar (cruz)
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '❌';
        deleteButton.title = 'Apagar este som (fade out)';
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

        // Botão de carregar som por célula
        const loadSingleButton = document.createElement('div');
        loadSingleButton.classList.add('load-single-button');
        loadSingleButton.innerHTML = '<span class="folder-icon">📂</span> Carregar';
        loadSingleButton.title = 'Carregar um som para esta célula';
        cellActions.appendChild(loadSingleButton);

        soundboardGrid.appendChild(cell);

        setupCellEvents(cell, index);

        // Inicializa o soundData para esta célula
        soundData[index] = null;

        return cell;
    }

    // Configura os eventos de Drag & Drop, Clique, Edição e Ações para uma célula
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
            if (file && (file.type === 'audio/wav' || file.type === 'audio/mp3' || file.type === 'audio/ogg')) {
                loadFileIntoCell(file, cell, index);
            } else {
                alert('Por favor, arraste um ficheiro de áudio válido (MP3, WAV, OGG).');
            }
        });

        // Click para tocar som
        cell.addEventListener('click', (e) => {
            // Verifica se o clique não foi nos botões de controlo da célula ou overlay
            if (!cell.classList.contains('empty') && 
                !e.target.closest('.sound-name') && 
                !e.target.closest('.key-info') && 
                !e.target.closest('.load-single-button') &&
                !e.target.closest('.delete-button') &&
                !cell.querySelector('.key-assign-overlay')) {
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

        // Carregar som por célula (botão 📂)
        const loadSingleButton = cell.querySelector('.load-single-button');
        loadSingleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Previne o clique na célula de tocar o som
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

        // Apagar som (botão ❌)
        const deleteButton = cell.querySelector('.delete-button');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Previne o clique na célula de tocar o som
            clearSoundCell(index);
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
                
                // Inicializa currentSources como um Set para gerir múltiplas instâncias
                soundData[index] = {
                    name: defaultName,
                    key: key,
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl,
                    currentSources: new Set() // Para gerir instâncias individuais de som
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
                currentSources: new Set()
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
        const loadSingleButton = cell.querySelector('.load-single-button');

        if (isEmpty) {
            cell.classList.add('empty');
            nameDisplay.textContent = 'Vazio';
            keyDisplay.textContent = 'Sem Tecla';
            deleteButton.style.display = 'none'; // Esconde a cruz para células vazias
            loadSingleButton.style.display = 'flex'; // Mostra o botão carregar na célula vazia
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || 'Sem Nome';
            keyDisplay.textContent = data.key ? data.key.toUpperCase() : 'Sem Tecla';
            deleteButton.style.display = 'flex'; // Mostra a cruz para células com som
            loadSingleButton.style.display = 'none'; // Esconde o botão carregar quando já tem som
        }
    }

    // Reproduz um som
    function playSound(index) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext();

        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
                playActualSound(sound, index);
            }).catch(e => console.error('Erro ao retomar AudioContext:', e));
        } else {
            playActualSound(sound, index);
        }
    }

    function playActualSound(sound, index) {
        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;
        source.connect(audioContext.masterGainNode);

        const cell = soundboardGrid.children[index];
        
        // Adiciona a instância à lista global e à lista da célula
        activeSounds.add(source);
        if (sound.currentSources) {
            sound.currentSources.add(source);
        } else {
            sound.currentSources = new Set([source]);
        }

        if (cell) {
            cell.classList.add('active');
            source.onended = () => {
                cell.classList.remove('active');
                activeSounds.delete(source);
                sound.currentSources.delete(source); // Remove da lista da célula
            };
        }

        // Lida com a opção de reproduzir múltiplas vezes
        if (playMultipleCheckbox.checked) {
            source.start(0);
        } else {
            // Se não for para reproduzir múltiplas vezes, para todas as instâncias anteriores daquela célula
            sound.currentSources.forEach(s => {
                if (s !== source && s.stop) { // Não parar a que acabou de ser iniciada
                    s.stop();
                    s.disconnect();
                    activeSounds.delete(s);
                }
            });
            sound.currentSources.clear(); // Limpa e adiciona a nova
            sound.currentSources.add(source);
            source.start(0);
        }
    }

    // Apaga um som da célula com fade out
    function clearSoundCell(index) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return; // Já está vazia
        }

        initAudioContext(); // Garante o contexto

        // Aplicar fade out a todas as instâncias ativas deste som
        if (sound.currentSources) {
            const now = audioContext.currentTime;
            const fadeDuration = 0.5; // 0.5 segundos de fade out

            sound.currentSources.forEach(source => {
                if (source.gain) { // Se o source tiver um nó de ganho (melhor prática)
                    source.gain.linearRampToValueAtTime(0, now + fadeDuration);
                } else { // Caso contrário, manipula o masterGainNode temporariamente ou para diretamente
                    // Esta parte é mais complexa sem um GainNode por som.
                    // Para simplificar, vamos parar a fonte após um pequeno atraso.
                    // A melhor solução seria ter um GainNode para cada SourceBuffer.
                    // Por agora, vamos apenas parar e desconectar.
                }
                setTimeout(() => {
                    if (source && source.stop) {
                        source.stop();
                        source.disconnect();
                        activeSounds.delete(source);
                    }
                }, fadeDuration * 1000 + 50); // Dá um tempinho extra para o fade
            });
            sound.currentSources.clear(); // Limpa as referências
        }
        
        // Reseta os dados da célula
        soundData[index] = null;
        const cell = soundboardGrid.children[index];
        updateCellDisplay(cell, { name: 'Vazio', key: '' }, true);
        saveSettings();
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
        
        // Controlo de volume com setas para cima/baixo
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
            // Atalho para parar todos os sons
            stopAllSounds();
        } else {
            // Procura e reproduz o som associado à tecla
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

    // Parar todos os sons (global)
    function stopAllSounds() {
        activeSounds.forEach(source => {
            if (source && source.stop) {
                source.stop();
                source.disconnect();
            }
        });
        activeSounds.clear();
        // Também limpar as referências nas células para evitar problemas
        soundData.forEach(sound => {
            if (sound && sound.currentSources) {
                sound.currentSources.clear();
            }
        });
    }

    stopAllSoundsBtn.addEventListener('click', stopAllSounds);

    // --- LÓGICA DE CARREGAMENTO DE MÚLTIPLOS SONS VIA BOTÃO GERAL ---

    loadSoundsButtonGeneral.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/mp3, audio/wav, audio/ogg';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            let startIndex = 0; // Começa a procurar células vazias a partir do início
            
            for (const file of files) {
                let foundEmptyCell = false;
                for (let i = startIndex; i < NUM_CELLS; i++) {
                    if (soundData[i] === null || soundData[i].audioBuffer === null) {
                        const cell = soundboardGrid.children[i];
                        await loadFileIntoCell(file, cell, i);
                        startIndex = i + 1; // Próximo ficheiro procura a partir desta célula + 1
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

    // --- FIM DA LÓGICA GERAL DE CARREGAMENTO ---

    // Inicialização: criar células e carregar configurações
    for (let i = 0; i < NUM_CELLS; i++) {
        createSoundCell(i);
    }
    loadSettings();

    // Workaround para o Chrome: AudioContext precisa de uma interação do utilizador para ser "resumido"
    // ou iniciado se o autoplay estiver bloqueado.
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
