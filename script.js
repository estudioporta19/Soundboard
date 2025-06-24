document.addEventListener('DOMContentLoaded', () => {
    const soundboardGrid = document.getElementById('soundboard-grid');
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    const loadSoundsButton = document.getElementById('load-sounds-button'); // Novo botão

    const NUM_CELLS = 12; // Número de células na soundboard
    let audioContext;
    const soundData = []; // Armazena info do som: { name, key, audioBuffer, audioDataUrl, currentSource }
    const activeSounds = new Set(); // Para controlar instâncias de sons a tocar para parar tudo

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
                // Se não há dados guardados, limpa a célula ou deixa como vazia
                updateCellDisplay(cell, { name: 'Vazio', key: '' }, true); // True para indicar que está vazia
            }
        }
    }

    // Guardar configurações no localStorage
    function saveSettings() {
        const settingsToSave = {
            volume: parseFloat(volumeRange.value), // Garante que é um número
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

        const nameDisplay = document.createElement('div');
        nameDisplay.classList.add('sound-name');
        nameDisplay.contentEditable = true;
        nameDisplay.spellcheck = false; // Desativa a verificação ortográfica
        nameDisplay.textContent = 'Vazio';
        nameDisplay.title = 'Clique para editar o nome';
        cell.appendChild(nameDisplay);

        const keyInfo = document.createElement('div');
        keyInfo.classList.add('key-info');
        keyInfo.innerHTML = '<span class="key-icon">⌨️</span> <span class="key-display">Sem Tecla</span>';
        keyInfo.title = 'Clique para atribuir uma tecla';
        cell.appendChild(keyInfo);

        soundboardGrid.appendChild(cell);

        // Adicionar eventos
        setupCellEvents(cell, index);

        // Inicializa o soundData para esta célula
        soundData[index] = null; // Indica que a célula está vazia inicialmente

        return cell;
    }

    // Configura os eventos de Drag & Drop e Clique para uma célula
    function setupCellEvents(cell, index) {
        // Drag & Drop
        cell.addEventListener('dragover', (e) => {
            e.preventDefault(); // Permite o drop
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
                // Ao arrastar e soltar um único ficheiro, usa a célula atual
                loadFileIntoCell(file, cell, index);
            } else {
                alert('Por favor, arraste um ficheiro de áudio válido (MP3, WAV, OGG).');
            }
        });

        // Click para tocar som
        cell.addEventListener('click', (e) => {
            if (!cell.classList.contains('empty') && !e.target.closest('.sound-name') && !e.target.closest('.key-info') && !cell.querySelector('.key-assign-overlay')) {
                playSound(index);
            }
        });

        // Edição de nome
        const nameDisplay = cell.querySelector('.sound-name');
        nameDisplay.addEventListener('blur', () => {
            if (soundData[index]) {
                soundData[index].name = nameDisplay.textContent.trim() || 'Sem Nome';
                nameDisplay.textContent = soundData[index].name; // Garante que o texto está limpo
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
            e.stopPropagation(); // Previne que o clique na tecla dispare o som
            assignKeyToCell(cell, index);
        });
    }

    // Carrega um ficheiro de áudio numa célula específica
    async function loadFileIntoCell(file, cell, index, nameOverride = null, keyOverride = null) {
        initAudioContext(); // Garante que o AudioContext está ativo

        const reader = new FileReader();
        reader.onload = async (e) => {
            const audioDataUrl = e.target.result; // Guarda o Data URL para persistência
            const arrayBuffer = e.target.result; // O ArrayBuffer completo

            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const defaultName = nameOverride || file.name.replace(/\.[^/.]+$/, ""); // Remove extensão
                const key = keyOverride !== null ? keyOverride : (soundData[index] ? soundData[index].key : ''); // Mantém a tecla se já existir ou usa override
                
                soundData[index] = {
                    name: defaultName,
                    key: key,
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl
                };
                updateCellDisplay(cell, soundData[index], false); // False para indicar que não está vazia
                saveSettings();
            } catch (error) {
                console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                alert(`Não foi possível carregar o áudio "${file.name}". Verifique o formato do ficheiro e se não está corrompido.`);
                // Limpa a célula se houver erro
                updateCellDisplay(cell, { name: 'Vazio', key: '' }, true); // True para indicar que está vazia
                soundData[index] = null;
                saveSettings();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Carrega um som a partir de um Data URL (usado ao carregar do localStorage)
    async function loadSoundFromDataURL(dataUrl, cell, index, name, key) {
        initAudioContext(); // Garante que o AudioContext está ativo

        try {
            // Extrai a parte Base64 do Data URL e converte para ArrayBuffer
            const base64Audio = dataUrl.split(',')[1]; 
            const arrayBuffer = base64ToArrayBuffer(base64Audio);
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            soundData[index] = {
                name: name || 'Sem Nome',
                key: key || '',
                audioBuffer: audioBuffer,
                audioDataUrl: dataUrl
            };
            updateCellDisplay(cell, soundData[index], false); // False para indicar que não está vazia
            // Não precisa de saveSettings aqui, pois já estamos a carregar
        } catch (error) {
            console.error('Erro ao decodificar áudio do Data URL:', error);
            alert(`Erro ao carregar o som "${name}". Pode estar corrompido.`);
            // Limpa a célula se houver erro
            updateCellDisplay(cell, { name: 'Vazio', key: '' }, true); // True para indicar que está vazia
            soundData[index] = null;
            saveSettings(); // Guarda para remover o som corrompido
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
        
        if (isEmpty) {
            cell.classList.add('empty');
            nameDisplay.textContent = 'Vazio';
            keyDisplay.textContent = 'Sem Tecla';
        } else {
            cell.classList.remove('empty');
            nameDisplay.textContent = data.name || 'Sem Nome';
            keyDisplay.textContent = data.key ? data.key.toUpperCase() : 'Sem Tecla';
        }
    }

    // Reproduz um som
    function playSound(index) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            return;
        }

        initAudioContext(); // Garante que o AudioContext está ativo e resume-o

        // Se o contexto de áudio estiver suspenso (por exemplo, após inatividade do utilizador), tente retomá-lo.
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
                // Tenta reproduzir novamente após a retoma
                playActualSound(sound, index);
            }).catch(e => console.error('Erro ao retomar AudioContext:', e));
        } else {
            playActualSound(sound, index);
        }
    }

    function playActualSound(sound, index) {
        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;
        source.connect(audioContext.masterGainNode); // Conecta ao GainNode para controlo de volume

        const cell = soundboardGrid.children[index];
        if (cell) {
            cell.classList.add('active');
            source.onended = () => {
                cell.classList.remove('active');
                activeSounds.delete(source);
            };
        }
        activeSounds.add(source); // Adiciona para controlo de parar todos os sons

        // Lida com a opção de reproduzir múltiplas vezes
        if (playMultipleCheckbox.checked) {
            source.start(0); // Inicia uma nova instância
        } else {
            // Se não for para reproduzir múltiplas vezes, para a instância anterior se existir
            if (sound.currentSource) {
                sound.currentSource.stop();
                sound.currentSource.disconnect(); // Desconecta para liberar recursos
                activeSounds.delete(sound.currentSource);
            }
            sound.currentSource = source; // Armazena a referência para a instância atual
            source.start(0);
        }
    }

    // Atribui uma tecla a uma célula
    function assignKeyToCell(cell, index) {
        const existingOverlay = cell.querySelector('.key-assign-overlay');
        if (existingOverlay) return; // Não adiciona múltiplos overlays

        const overlay = document.createElement('div');
        overlay.classList.add('key-assign-overlay');
        overlay.innerHTML = '<p>Pressione uma tecla para atribuir</p><span id="assigned-key-display">...</span>';
        cell.appendChild(overlay);

        const assignedKeyDisplay = overlay.querySelector('#assigned-key-display');

        const keyListener = (e) => {
            e.preventDefault(); // Previne o comportamento padrão da tecla
            e.stopPropagation(); // Previne que o evento chegue a outros listeners

            const pressedKey = e.key.toLowerCase();

            // Exclui teclas de controlo comuns que não devem ser atribuídas
            if (['escape', 'alt', 'control', 'shift', 'tab', 'capslock', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'].includes(pressedKey)) {
                assignedKeyDisplay.textContent = 'Inválido!';
                setTimeout(() => assignedKeyDisplay.textContent = '...', 800);
                return;
            }

            // Verifica se a tecla já está atribuída a outro som
            const isKeyTaken = soundData.some((s, i) => s && s.key === pressedKey && i !== index);

            if (isKeyTaken) {
                assignedKeyDisplay.textContent = 'Já em uso!';
                setTimeout(() => assignedKeyDisplay.textContent = '...', 800);
                return;
            }

            // Se for 'Backspace' ou 'Delete', limpa a atribuição da tecla
            if (pressedKey === 'backspace' || pressedKey === 'delete') {
                if (soundData[index]) {
                    soundData[index].key = '';
                }
                const keyDisplay = cell.querySelector('.key-display');
                keyDisplay.textContent = 'Sem Tecla';
            } else {
                // Atribui a nova tecla
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

        // Adiciona um listener temporário para capturar a próxima tecla pressionada
        document.addEventListener('keydown', keyListener, { once: true }); // Apenas uma vez

        // Se o utilizador clicar fora do overlay ou demorar muito, remove o overlay
        const clickOutsideListener = (e) => {
            if (!overlay.contains(e.target)) {
                cell.removeChild(overlay);
                document.removeEventListener('keydown', keyListener);
                document.removeEventListener('click', clickOutsideListener);
            }
        };
        setTimeout(() => { // Pequeno atraso para evitar clique imediato
            document.addEventListener('click', clickOutsideListener);
        }, 100);
    }

    // Evento de teclado global
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        // Evita que o evento de teclado dispare enquanto um campo de texto está ativo
        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            return;
        }
        
        // Controlo de volume com setas para cima/baixo
        if (pressedKey === 'arrowup') {
            e.preventDefault(); // Previne o scroll da página
            volumeRange.value = Math.min(1, parseFloat(volumeRange.value) + 0.05);
            updateVolumeDisplay();
            if (audioContext && audioContext.masterGainNode) {
                audioContext.masterGainNode.gain.value = volumeRange.value;
            }
            saveSettings();
        } else if (pressedKey === 'arrowdown') {
            e.preventDefault(); // Previne o scroll da página
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

    // Parar todos os sons
    function stopAllSounds() {
        activeSounds.forEach(source => {
            if (source && source.stop) {
                source.stop();
                source.disconnect(); // Desconecta para liberar recursos
            }
        });
        activeSounds.clear(); // Limpa o conjunto de sons ativos
    }

    stopAllSoundsBtn.addEventListener('click', stopAllSounds);

    // --- NOVA LÓGICA DE CARREGAMENTO DE SONS VIA BOTÃO ---

    loadSoundsButton.addEventListener('click', () => {
        // Cria um input de ficheiro dinâmico
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/mp3, audio/wav, audio/ogg';
        input.multiple = true; // Permite seleção de múltiplos ficheiros
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files); // Converte FileList para Array
            let currentCellIndex = 0;

            for (const file of files) {
                // Encontra a próxima célula vazia
                let foundEmptyCell = false;
                for (let i = currentCellIndex; i < NUM_CELLS; i++) {
                    if (soundData[i] === null || soundData[i].audioBuffer === null) {
                        const cell = soundboardGrid.children[i];
                        await loadFileIntoCell(file, cell, i);
                        currentCellIndex = i + 1; // Avança para a próxima célula
                        foundEmptyCell = true;
                        break; // Sai do loop interno, vai para o próximo ficheiro
                    }
                }
                if (!foundEmptyCell) {
                    alert(`Não há mais células vazias para carregar "${file.name}".`);
                    break; // Sai do loop de ficheiros se não houver mais espaço
                }
            }
        };
        input.click(); // Simula um clique para abrir o diálogo de ficheiros
    });

    // --- FIM DA NOVA LÓGICA ---

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
    }, { once: true }); // Garante que este listener só corre uma vez
});
