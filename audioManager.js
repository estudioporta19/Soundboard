// audioManager.js
import { saveAudio, getAudio, deleteAudio, clearAllAudioFiles } from './dbManager.js';

let lastPlayedSoundIndex = null;

// Funções de áudio
/**
 * Inicializa o AudioContext e o Master Gain Node.
 * Deve ser chamado na primeira interação do utilizador para evitar a política de autoplay.
 * @param {object} sb - O objeto soundboardApp global.
 */
function initAudioContext(sb) {
    if (!sb.audioContext) {
        sb.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sb.masterGainNode = sb.audioContext.createGain();
        sb.masterGainNode.connect(sb.audioContext.destination);
        // Define o volume inicial
        sb.masterGainNode.gain.value = parseFloat(sb.volumeRange.value);
        console.log("AudioContext e Master Gain Node inicializados.");
    }
}

/**
 * Carrega um ficheiro de áudio para uma célula específica.
 * @param {File} file - O ficheiro de áudio a ser carregado.
 * @param {number} index - O índice da célula onde carregar o áudio.
 * @param {Array<object>} soundData - O array de dados dos sons.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @param {function} updateCellDisplay - Callback para atualizar o display da célula.
 * @param {function} getTranslation - Função para obter traduções.
 * @param {function} saveSettings - Função para salvar as configurações.
 * @returns {Promise<void>}
 */
async function loadFileIntoCell(file, index, soundData, audioContext, updateCellDisplay, getTranslation, saveSettings) {
    // Certifica-se que o AudioContext está inicializado
    if (!audioContext) {
        initAudioContext(window.soundboardApp); // Inicializa se ainda não estiver
        audioContext = window.soundboardApp.audioContext;
    }

    // Primeiro, tenta limpar qualquer som existente nesta célula
    if (soundData[index] && soundData[index].soundFileId) {
        try {
            await deleteAudio(soundData[index].soundFileId);
            console.log(`Ficheiro antigo da célula ${index} apagado do IndexedDB.`);
        } catch (error) {
            console.warn(`Não foi possível apagar o ficheiro antigo da célula ${index} no IndexedDB:`, error);
        }
    }

    const reader = new FileReader();

    return new Promise(async (resolve, reject) => {
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;

            // *** CRUCIAL: CRIE UMA CÓPIA DO ARRAYBUFFER PARA SALVAR NO INDEXEDDB ***
            const arrayBufferCopy = arrayBuffer.slice(0);

            let audioBuffer;
            try {
                // Use o ArrayBuffer original (que será desanexado) para decodificação
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            } catch (error) {
                console.error(`[loadFileIntoCell] Erro ao decodificar áudio para célula ${index} (${file.name}):`, error);
                alert(`${getTranslation('decodingError')}: ${file.name}`);
                // Limpa o slot em caso de erro de decodificação
                soundData[index] = null;
                updateCellDisplay(index, soundData, getTranslation);
                return reject(error);
            }

            let soundFileId;
            try {
                // Salve a cópia no IndexedDB
                soundFileId = await saveAudio(file.name, arrayBufferCopy, file.type);
                console.log(`Áudio ${file.name} salvo no IndexedDB com ID: ${soundFileId}`);
            } catch (error) {
                console.error(`[loadFileIntoCell] Erro ao salvar áudio no IndexedDB para célula ${index} (${file.name}):`, error);
                alert(`${getTranslation('indexedDBSaveError')}: ${file.name}`);
                // Limpa o slot em caso de erro de salvamento
                soundData[index] = null;
                updateCellDisplay(index, soundData, getTranslation);
                return reject(error);
            }

            // Atualiza soundData com o soundFileId
            soundData[index] = {
                name: file.name,
                key: window.soundboardApp.defaultKeys[index],
                soundFileId: soundFileId,
                _audioBufferCache: audioBuffer, // Armazena em cache após o carregamento inicial
                activePlayingInstances: new Set(),
                color: null,
                isLooping: false,
                isCued: false
            };

            updateCellDisplay(index, soundData, getTranslation);
            saveSettings(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);

            resolve();
        };

        reader.onerror = (e) => {
            console.error(`Erro ao ler o ficheiro ${file.name}:`, reader.error);
            alert(`${getTranslation('fileReadError')}: ${file.name}`);
            reject(reader.error);
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Carrega um AudioBuffer do IndexedDB pelo seu soundFileId.
 * @param {number} soundFileId - O ID do ficheiro de áudio no IndexedDB.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @returns {Promise<AudioBuffer>} Uma Promise que resolve com o AudioBuffer.
 */
async function loadSoundFromIndexedDB(soundFileId, audioContext) {
    const audioData = await getAudio(soundFileId);
    if (!audioData) {
        throw new Error(`Áudio com ID ${soundFileId} não encontrado no IndexedDB.`);
    }

    // O ArrayBuffer retornado pelo IndexedDB é seguro para decodificação
    const audioBuffer = await audioContext.decodeAudioData(audioData.data);
    return audioBuffer;
}

/**
 * Toca um som.
 * @param {number} index - O índice da célula a ser tocada.
 * @param {Array<object>} soundData - O array de dados dos sons.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @param {HTMLInputElement} playMultipleCheckbox - Checkbox para tocar múltiplos sons.
 * @param {HTMLInputElement} autokillModeCheckbox - Checkbox para modo autokill.
 * @param {Set<object>} globalActivePlayingInstances - Set de todas as instâncias a tocar.
 * @param {number} fadeInDuration - Duração do fade-in em segundos.
 * @param {number} fadeOutDuration - Duração do fade-out em segundos.
 * @param {HTMLInputElement} volumeRange - Elemento de input do volume master.
 * @param {HTMLElement} soundCellElement - O elemento DOM da célula do som (opcional, para feedback visual).
 * @returns {Promise<void>}
 */
async function playSound(index, soundData, audioContext, playMultipleCheckbox, autokillModeCheckbox, globalActivePlayingInstances, fadeInDuration, fadeOutDuration, volumeRange, soundCellElement) {
    if (!soundData[index] || !soundData[index].soundFileId) {
        console.log(`Célula ${index} vazia ou sem soundFileId.`);
        return;
    }

    // Inicializa o AudioContext se ainda não estiver ativo
    if (!audioContext || audioContext.state === 'suspended') {
        initAudioContext(window.soundboardApp);
        audioContext = window.soundboardApp.audioContext;
    }

    let audioBuffer = soundData[index]._audioBufferCache;

    // Se o AudioBuffer não estiver em cache, carregue-o do IndexedDB
    if (!audioBuffer) {
        try {
            audioBuffer = await loadSoundFromIndexedDB(soundData[index].soundFileId, audioContext);
            soundData[index]._audioBufferCache = audioBuffer; // Cache para futuras reproduções
            console.log(`AudioBuffer para célula ${index} carregado do IndexedDB.`);
        } catch (error) {
            console.error(`Erro ao carregar AudioBuffer do IndexedDB para célula ${index}:`, error);
            // Poderia notificar o usuário aqui se necessário
            return;
        }
    }

    const isLooping = soundData[index].isLooping;
    const playMultiple = playMultipleCheckbox.checked;
    const autokillMode = autokillModeCheckbox.checked;

    if (soundData[index].activePlayingInstances.size > 0 && !playMultiple) {
        // Se não permite múltiplos e já está a tocar, para o som antes de recomeçar
        stopSound(index, soundData, audioContext, fadeOutDuration, globalActivePlayingInstances);
        // Pequeno atraso para o fade-out se completar antes de iniciar o novo som
        if (fadeOutDuration > 0) {
            await new Promise(resolve => setTimeout(resolve, fadeOutDuration * 1000));
        }
    }

    if (autokillMode) {
        // Para todos os outros sons exceto este (se estiver a tocar múltiplos, continua a tocar os outros)
        globalActivePlayingInstances.forEach(instance => {
            if (instance.index !== index) { // Verifica se é uma instância de outro som
                fadeoutSound(instance.source, instance.gain, instance.context, fadeOutDuration)
                    .then(() => {
                        instance.source.stop();
                        instance.source.disconnect();
                        instance.gain.disconnect();
                        globalActivePlayingInstances.delete(instance);
                        // Remover feedback visual se a instância for única para essa célula e for parada
                        const otherCell = document.querySelector(`.sound-cell[data-index="${instance.index}"]`);
                        if (otherCell && !soundData[instance.index]?.activePlayingInstances.size) {
                            otherCell.classList.remove('playing-feedback');
                        }
                    })
                    .catch(e => console.error("Erro ao fazer fade-out de instância de outro som:", e));
            }
        });
        // Remove feedback visual de todas as outras células
        document.querySelectorAll('.sound-cell.playing-feedback').forEach(cell => {
            const cellIndex = parseInt(cell.dataset.index);
            if (cellIndex !== index) {
                cell.classList.remove('playing-feedback');
            }
        });
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1; // Volume inicial para este som
    source.connect(gainNode);
    gainNode.connect(window.soundboardApp.masterGainNode); // Conecta ao master gain

    source.loop = isLooping;

    // Adiciona a instância à lista global e à lista da célula
    const instance = { source, gain: gainNode, context: audioContext, index: index };
    globalActivePlayingInstances.add(instance);
    soundData[index].activePlayingInstances.add(instance);

    // Feedback visual
    if (soundCellElement) {
        soundCellElement.classList.add('playing-feedback');
    }

    if (fadeInDuration > 0) {
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeInDuration);
    }

    source.start(0);
    lastPlayedSoundIndex = index;

    // Remove a instância quando o som terminar
    source.onended = () => {
        // Verifica se a instância ainda está ativa antes de tentar remover o feedback
        if (soundData[index] && soundData[index].activePlayingInstances.has(instance)) {
            globalActivePlayingInstances.delete(instance);
            soundData[index].activePlayingInstances.delete(instance);
            source.disconnect();
            gainNode.disconnect();

            // Só remove o feedback se não houver mais instâncias a tocar para esta célula
            if (soundData[index].activePlayingInstances.size === 0 && soundCellElement) {
                soundCellElement.classList.remove('playing-feedback');
            }
        }
    };
}

/**
 * Para um som específico.
 * @param {number} index - O índice da célula a ser parada.
 * @param {Array<object>} soundData - O array de dados dos sons.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @param {number} fadeOutDuration - Duração do fade-out em segundos.
 * @param {Set<object>} globalActivePlayingInstances - Set de todas as instâncias a tocar.
 */
function stopSound(index, soundData, audioContext, fadeOutDuration, globalActivePlayingInstances) {
    if (!soundData[index] || soundData[index].activePlayingInstances.size === 0) {
        return;
    }

    const instancesToStop = Array.from(soundData[index].activePlayingInstances);
    instancesToStop.forEach(instance => {
        fadeoutSound(instance.source, instance.gain, audioContext, fadeOutDuration)
            .then(() => {
                // Certifica-se de que a instância ainda existe antes de desconectar
                if (soundData[index] && soundData[index].activePlayingInstances.has(instance)) {
                    instance.source.stop(); // Interrompe o som após o fade-out
                    instance.source.disconnect();
                    instance.gain.disconnect();
                    globalActivePlayingInstances.delete(instance);
                    soundData[index].activePlayingInstances.delete(instance);
                    // Só remove o feedback se não houver mais instâncias ativas para esta célula
                    if (soundData[index].activePlayingInstances.size === 0) {
                        const soundCellElement = document.querySelector(`.sound-cell[data-index="${index}"]`);
                        if (soundCellElement) {
                            soundCellElement.classList.remove('playing-feedback');
                        }
                    }
                }
            })
            .catch(e => console.error("Erro ao fazer fade-out:", e));
    });
}

/**
 * Aplica um fade-out a um som.
 * @param {AudioBufferSourceNode} source - O AudioBufferSourceNode.
 * @param {GainNode} gainNode - O GainNode associado.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @param {number} duration - Duração do fade-out em segundos.
 * @returns {Promise<void>} Uma Promise que resolve quando o fade-out termina.
 */
function fadeoutSound(source, gainNode, audioContext, duration) {
    return new Promise(resolve => {
        if (duration > 0) {
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
            // Interrompe o som após o fade-out
            source.stop(audioContext.currentTime + duration);
            source.onended = () => {
                resolve(); // Resolve a promise quando o som realmente parar
            };
        } else {
            gainNode.gain.value = 0; // Corte imediato
            source.stop();
            resolve(); // Resolve imediatamente
        }
    });
}

/**
 * Para todos os sons atualmente a tocar.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @param {Set<object>} globalActivePlayingInstances - Set de todas as instâncias a tocar.
 * @param {Array<object>} soundData - O array de dados dos sons.
 * @param {number} [fadeOutDuration=0] - Duração opcional do fade-out. Se 0, para imediatamente.
 */
async function stopAllSounds(audioContext, globalActivePlayingInstances, soundData, fadeOutDuration = 0) {
    if (!audioContext || audioContext.state === 'closed') {
        console.log("AudioContext não está ativo ou está fechado. Nada para parar.");
        return;
    }

    const instancesToStop = Array.from(globalActivePlayingInstances);
    const stopPromises = [];

    instancesToStop.forEach(instance => {
        stopPromises.push(fadeoutSound(instance.source, instance.gain, audioContext, fadeOutDuration)
            .then(() => {
                // Após o fade-out, garante que a instância é removida
                if (globalActivePlayingInstances.has(instance)) {
                    instance.source.disconnect();
                    instance.gain.disconnect();
                    globalActivePlayingInstances.delete(instance);
                    if (soundData[instance.index]) { // Verifica se soundData[index] ainda existe
                        soundData[instance.index].activePlayingInstances.delete(instance);
                    }
                }
            })
            .catch(e => console.error("Erro ao fazer fade-out de som global:", e)));
    });

    await Promise.all(stopPromises);

    // Remove feedback visual de todas as células após todos os sons pararem
    document.querySelectorAll('.sound-cell.playing-feedback').forEach(cell => {
        cell.classList.remove('playing-feedback');
    });

    console.log("Todos os sons foram parados.");
}

/**
 * Carrega múltiplos ficheiros de áudio para as células.
 * Começa pelo startIndex e preenche sequencialmente.
 * @param {Array<File>} files - Array de objetos File.
 * @param {number} startIndex - Índice inicial para carregar os sons.
 * @param {Array<object>} soundData - O array de dados dos sons.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @param {function} updateCellDisplay - Callback para atualizar o display da célula.
 * @param {function} getTranslation - Função para obter traduções.
 * @param {function} saveSettings - Função para salvar as configurações.
 * @returns {Promise<void>}
 */
async function loadMultipleFilesIntoCells(files, startIndex, soundData, audioContext, updateCellDisplay, getTranslation, saveSettings) {
    const numCells = window.soundboardApp.NUM_CELLS;
    let currentCellIndex = startIndex;
    const loadPromises = [];

    // Certifica-se que o AudioContext está inicializado
    if (!audioContext) {
        initAudioContext(window.soundboardApp); // Inicializa se ainda não estiver
        audioContext = window.soundboardApp.audioContext;
    }

    for (const file of files) {
        // Encontra o próximo slot disponível ou sobrescreve se não houver slots vazios
        while (currentCellIndex < numCells && soundData[currentCellIndex] && soundData[currentCellIndex].soundFileId) {
            currentCellIndex++;
        }

        if (currentCellIndex >= numCells) {
            console.warn("Todas as células estão preenchidas. Ignorando ficheiros restantes.");
            alert(getTranslation('allCellsFull'));
            break; // Sai do loop se não houver mais células disponíveis
        }

        loadPromises.push(loadFileIntoCell(file, currentCellIndex, soundData, audioContext, updateCellDisplay, getTranslation, saveSettings));
        currentCellIndex++;
    }

    await Promise.all(loadPromises)
        .then(() => {
            console.log("Todos os ficheiros foram processados.");
            saveSettings(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        })
        .catch(error => {
            console.error("Erro durante o carregamento de múltiplos ficheiros:", error);
            alert(`${getTranslation('multipleFilesLoadError')}: ${error.message}`);
        });
}

/**
 * Limpa todas as células de som, parando os sons, removendo-os do DOM e do IndexedDB.
 * @param {Array<object>} soundData - O array de dados dos sons.
 * @param {AudioContext} audioContext - O contexto de áudio.
 * @param {Set<object>} globalActivePlayingInstances - Set de todas as instâncias a tocar.
 * @param {number} NUM_CELLS - O número total de células.
 * @param {function} updateCellDisplay - Callback para atualizar o display da célula.
 * @param {function} getTranslation - Função para obter traduções.
 * @param {function} saveSettings - Função para salvar as configurações.
 */
async function clearAllSoundCells(soundData, audioContext, globalActivePlayingInstances, NUM_CELLS, updateCellDisplay, getTranslation, saveSettings) {
    await stopAllSounds(audioContext, globalActivePlayingInstances, soundData); // Primeiro, para todos os sons

    const deletePromises = [];
    for (let i = 0; i < NUM_CELLS; i++) {
        if (soundData[i] && soundData[i].soundFileId) {
            deletePromises.push(deleteAudio(soundData[i].soundFileId)
                .catch(error => console.error(`Erro ao apagar áudio do IndexedDB para célula ${i}:`, error))); // Não bloqueia o loop
        }
        // Limpa o slot no soundData e atualiza a UI
        soundData[i] = null; // Zera o objeto da célula
        updateCellDisplay(i, soundData, getTranslation);
    }
    await Promise.all(deletePromises); // Espera que todas as exclusões do DB terminem

    await clearAllAudioFiles(); // Limpa a object store de ficheiros de áudio no IndexedDB

    // Reseta as configurações para o padrão (exceto volume/fade, que serão salvos do UI)
    soundData.length = 0; // Limpa completamente o array
    for (let i = 0; i < NUM_CELLS; i++) {
        soundData.push(null); // Recria os slots como nulos
    }

    console.log("Todas as células limpas e sons removidos do IndexedDB.");
    saveSettings(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
}


/**
 * @returns {number|null} O índice do último som que começou a tocar, ou null se nenhum som tocou.
 */
function getLastPlayedSoundIndex() {
    return lastPlayedSoundIndex;
}

// Exporta as funções que precisam ser acessíveis de outros módulos
export {
    initAudioContext,
    loadFileIntoCell,
    loadSoundFromIndexedDB, // Exporta para que settingsManager/sessionManager possam usá-lo
    playSound,
    stopSound,
    fadeoutSound,
    stopAllSounds,
    loadMultipleFilesIntoCells,
    clearAllSoundCells,
    getLastPlayedSoundIndex
};
