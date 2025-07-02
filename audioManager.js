// audioManager.js
// Gerencia a inicialização do AudioContext, carregamento e reprodução de sons.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.audioManager = (function() {
    let audioContext;
    let masterGainNode; // Master gain node for global volume control
    let lastPlayedSoundIndex = null; // To manage autokill and QLab-style navigation

    function initAudioContext(volumeRange) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
            masterGainNode.gain.value = volumeRange.value;
            window.soundboardApp.audioContext = audioContext; // Make it globally accessible
            window.soundboardApp.masterGainNode = masterGainNode; // Make masterGainNode globally accessible
        }
    }

    async function loadSoundFromDataURL(audioDataUrl, cell, index, name, key, color, isLooping, isCued, soundData, audioContextParam, updateCellDisplay, getTranslation, saveSettingsCallback) {
        // Ensure audioContext is initialized and available
        initAudioContext(window.soundboardApp.volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext; // Use passed context or global

        if (!currentAudioContext) {
            console.error("AudioContext não inicializado ao tentar carregar som da Data URL.");
            return;
        }

        if (!audioDataUrl || typeof audioDataUrl !== 'string' || !audioDataUrl.startsWith('data:audio')) {
            console.error(`audioDataUrl inválida para célula ${index}:`, audioDataUrl);
            // Treat as empty cell if data URL is invalid
            if (soundData[index]) {
                clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            }
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: key || '', isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
            saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
            return; // Exit early
        }

        const arrayBuffer = base64ToArrayBuffer(audioDataUrl.split(',')[1]); // Decode base64 to ArrayBuffer

        try {
            console.log(`[loadSoundFromDataURL] Tentando decodificar Data URL para célula ${index}...`); // NOVO LOG
            const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer); // Use currentAudioContext
            console.log(`[loadSoundFromDataURL] Sucesso na decodificação de Data URL para célula ${index}. Duração: ${audioBuffer.duration}s`); // NOVO LOG

            if (soundData[index]) {
                // Clear any existing instances for this cell before replacing
                clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            }

            soundData[index] = {
                name: name,
                key: key,
                audioBuffer: audioBuffer,
                audioDataUrl: audioDataUrl,
                activePlayingInstances: new Set(),
                color: color,
                isLooping: isLooping,
                isCued: isCued // Set cued status
            };
            updateCellDisplay(cell, soundData[index], false, getTranslation);
            saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        } catch (error) {
            console.error(`[loadSoundFromDataURL] ERRO FATAL ao decodificar o áudio da Data URL para célula ${index}:`, error); // CRÍTICO: Este log
            alert(getTranslation('alertDecodeError').replace('{soundName}', name || 'N/A') + `\nDetalhes: ${error.message}`); // Adicionado detalhes do erro
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: key || '', isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
            saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        }
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async function loadFileIntoCell(file, cell, index, soundData, audioContextParam, updateCellDisplay, getTranslation, saveSettingsCallback) {
        // Ensure audioContext is initialized and available
        initAudioContext(window.soundboardApp.volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext; // Use passed context or global

        if (!currentAudioContext) {
            console.error("[loadFileIntoCell] AudioContext não inicializado ao tentar carregar ficheiro.");
            alert(getTranslation('alertLoadError').replace('{fileName}', file.name) + " (AudioContext não pronto)");
            return;
        }

        console.log(`[loadFileIntoCell] Iniciando carregamento para ficheiro: ${file.name}, Tipo: ${file.type}, Tamanho: ${file.size} bytes`); // NOVO LOG

        const reader = new FileReader();
        reader.onload = async (e) => {
            const audioDataUrl = e.target.result; // This will be a Data URL string
            console.log(`[loadFileIntoCell] FileReader carregou Data URL para ${file.name}. Tamanho da Data URL: ${audioDataUrl.length} caracteres.`); // NOVO LOG
            
            try {
                // Ensure arrayBuffer is derived correctly from the Data URL for decoding
                const arrayBuffer = base64ToArrayBuffer(audioDataUrl.split(',')[1]);
                console.log(`[loadFileIntoCell] ArrayBuffer criado para ${file.name}. Tamanho do buffer: ${arrayBuffer.byteLength} bytes.`); // NOVO LOG
                
                console.log(`[loadFileIntoCell] Tentando decodificar áudio para ${file.name}...`); // NOVO LOG
                const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer)
                    .then(buffer => {
                        console.log(`[loadFileIntoCell] Sucesso na decodificação de ${file.name}. Duração: ${buffer.duration} segundos.`); // NOVO LOG
                        return buffer;
                    })
                    .catch(error => {
                        console.error(`[loadFileIntoCell] ERRO NA DECODIFICAÇÃO para ${file.name}:`, error); // CRÍTICO: Este é o log que precisamos!
                        alert(getTranslation('alertAudioDecodeError').replace('{fileName}', file.name) + `\nDetalhes: ${error.message}`);
                        return null; // Retorna null para indicar falha
                    });

                if (!audioBuffer) {
                    console.warn(`[loadFileIntoCell] AudioBuffer não criado para ${file.name}. Abortando carregamento para célula ${index}.`); // NOVO LOG
                    // If decoding failed, ensure cell is empty
                    const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
                    soundData[index] = null; // Ensure the slot is marked as empty
                    saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
                    return;
                }

                // Obter fixedKey do array global defaultKeys
                const fixedKey = window.soundboardApp.defaultKeys[index];

                const defaultName = file.name.replace(/\.[^/.]+$/, "");
                const cellColor = window.soundboardApp.utils.getRandomHSLColor();

                if (soundData[index]) {
                    clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
                }

                soundData[index] = {
                    name: defaultName,
                    key: fixedKey, // Agora fixedKey está definido
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl, // Save the Data URL string here
                    activePlayingInstances: new Set(),
                    color: cellColor,
                    isLooping: false,
                    isCued: false
                };
                updateCellDisplay(cell, soundData[index], false, getTranslation);
                saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
                console.log(`[loadFileIntoCell] Ficheiro ${file.name} carregado com sucesso na célula ${index}.`); // NOVO LOG FINAL
            } catch (error) {
                // Este catch pegaria erros antes ou fora do decodeAudioData().then().catch()
                console.error(`[loadFileIntoCell] ERRO GERAL no processamento do áudio para célula ${index} (${file.name}):`, error); // CRÍTICO: Este log
                alert(getTranslation('alertLoadError').replace('{fileName}', file.name) + `\nDetalhes: ${error.message}`);
                // Use fixedKey aqui também
                const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
                soundData[index] = null; // Ensure the slot is marked as empty
                saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
            }
        };
        reader.onerror = (error) => { // NOVO: Captura erros do FileReader
            console.error(`[loadFileIntoCell] Erro no FileReader ao carregar ${file.name}:`, error);
            alert(getTranslation('alertLoadError').replace('{fileName}', file.name) + `\nErro de leitura: ${error.message}`);
            const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
            saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        };
        reader.readAsDataURL(file); // Changed to readAsDataURL to ensure audioDataUrl is a string Data URL
    }

    /**
     * Carrega múltiplos ficheiros de áudio em células sequenciais a partir de um índice de início.
     * @param {File[]} files - Um array de objetos File a serem carregados.
     * @param {number} startIndex - O índice da célula a partir da qual o carregamento deve começar.
     * @param {Array} soundData - O array de dados de som global.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações.
     */
    async function loadMultipleFilesIntoCells(files, startIndex, soundData, audioContextParam, updateCellDisplay, getTranslation, saveSettingsCallback) {
        initAudioContext(window.soundboardApp.volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        if (!currentAudioContext) {
            console.error("AudioContext não inicializado ao tentar carregar múltiplos ficheiros.");
            alert(getTranslation('alertLoadError').replace('{fileName}', 'Múltiplos Ficheiros') + " (AudioContext não pronto)");
            return;
        }

        let currentIndex = startIndex;
        for (const file of files) {
            if (currentIndex >= window.soundboardApp.NUM_CELLS) {
                alert(getTranslation('alertNoEmptyCells').replace('{fileName}', file.name));
                break; // Não há mais células para carregar
            }

            const cell = document.querySelector(`.sound-cell[data-index="${currentIndex}"]`);
            if (cell) {
                await loadFileIntoCell(file, cell, currentIndex, soundData, currentAudioContext, updateCellDisplay, getTranslation, saveSettingsCallback);
            } else {
                console.warn(`Célula com índice ${currentIndex} não encontrada. Ignorando ficheiro ${file.name}.`);
            }
            currentIndex++; // Move para a próxima célula
        }
    }

    function playSound(index, soundData, audioContextParam, playMultipleCheckbox, autokillModeCheckbox, globalActivePlayingInstances, currentFadeInDuration, currentFadeOutDuration, volumeRange) {
        initAudioContext(volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) cell.classList.remove('active', 'playing-feedback'); // Also remove playing-feedback if no sound
            console.log(`Célula ${index} vazia ou áudio não carregado.`);
            return false; // Indicate that sound was not played
        }

        const now = currentAudioContext.currentTime; // Use currentAudioContext

        // Get the cell element for visual feedback
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('playing-feedback'); // Add the class right at the start of playback
        }

        // Auto-kill previous sound if enabled and not playing multiple
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            // Stop specific instances of the previously played sound
            const prevSound = soundData[lastPlayedSoundIndex];
            if (prevSound && prevSound.activePlayingInstances.size > 0) {
                 prevSound.activePlayingInstances.forEach(instance => {
                     stopSoundInstance(instance, now, 0.1); // Quick fade out for previous sound
                 });
                 prevSound.activePlayingInstances.clear(); // Clear all instances from this sound
            }
            // Ensure 'active' and 'playing-feedback' classes are removed from the previous cell
            const prevCell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
            if (prevCell) {
                prevCell.classList.remove('active', 'playing-feedback');
            }
        }

        // If not playing multiple, stop all active instances of THIS sound before playing a new one
        if (!playMultipleCheckbox.checked && sound.activePlayingInstances.size > 0) {
            sound.activePlayingInstances.forEach(instance => {
                stopSoundInstance(instance, now, currentFadeOutDuration);
            });
            sound.activePlayingInstances.clear();
        }

        const source = currentAudioContext.createBufferSource(); // Use currentAudioContext
        source.buffer = sound.audioBuffer;
        source.loop = sound.isLooping;

        const gainNode = currentAudioContext.createGain(); // Use currentAudioContext
        gainNode.gain.value = 0.001; // Start from near silent for fade-in

        source.connect(gainNode);
        gainNode.connect(masterGainNode); // Connect to the master gain

        const initialVolume = window.soundboardApp.volumeRange.value; // Get current global volume from appState

        if (currentFadeInDuration > 0) {
            gainNode.gain.linearRampToValueAtTime(initialVolume, now + currentFadeInDuration);
        } else {
            gainNode.gain.setValueAtTime(initialVolume, now); // Immediate start
        }

        source.start(now);

        const activeInstance = { source: source, gain: gainNode, startTime: now, soundDataEntry: sound, cellIndex: index }; // Added soundDataEntry and cellIndex for easier lookup
        sound.activePlayingInstances.add(activeInstance);
        globalActivePlayingInstances.add(activeInstance);

        source.onended = () => {
            sound.activePlayingInstances.delete(activeInstance);
            globalActivePlayingInstances.delete(activeInstance);
            // Only remove 'active' and 'playing-feedback' classes if no other instances of this sound are playing
            if (cell && sound.activePlayingInstances.size === 0) {
                cell.classList.remove('active', 'playing-feedback'); // Remove both classes
            }
        };

        if (cell) {
            cell.classList.add('active');
            // Remove active class after sound finishes if not looping
            if (!sound.isLooping) {
                setTimeout(() => {
                    // This timeout only removes 'active' and 'playing-feedback' if the sound truly finished
                    // and no other instances are playing (important for 'play multiple' scenarios).
                    if (!sound.isLooping && sound.activePlayingInstances.size === 0) {
                         cell.classList.remove('active', 'playing-feedback');
                    }
                }, (sound.audioBuffer.duration + currentFadeInDuration) * 1000 + 50); // Add a small buffer
            }
        }

        lastPlayedSoundIndex = index; // Update cursor after a successful play
        return true; // Indicate that sound was played
    }

    function stopSoundInstance(instance, now, fadeDuration) {
        if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
            try {
                // Cancel any pending automations on the gain node
                instance.gain.gain.cancelScheduledValues(now);
                // Set the current value as the base for the ramp
                instance.gain.gain.setValueAtTime(instance.gain.gain.value, now);
                // Ramp down to near silence
                instance.gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

                // Stop the source after the fade duration plus a small buffer
                instance.source.stop(now + fadeDuration + 0.05);
                instance.source.onended = null; // Clear onended to prevent re-triggering logic

                // Remove the 'playing-feedback' class from the associated cell after the fade
                if (instance.cellIndex !== undefined) {
                    const cell = document.querySelector(`.sound-cell[data-index="${instance.cellIndex}"]`);
                    setTimeout(() => {
                        if (cell && instance.soundDataEntry && instance.soundDataEntry.activePlayingInstances.size === 0) {
                            cell.classList.remove('active', 'playing-feedback');
                        }
                    }, (fadeDuration * 1000) + 100); // Wait a bit more than the fade duration
                }

            } catch (error) {
                console.warn("Erro ao parar instância de som ou aplicar fade-out:", error);
                // Fallback to immediate stop if scheduled fade fails
                if (instance.source && typeof instance.source.stop === 'function') {
                    instance.source.stop();
                    // Immediate removal of class if stop was immediate
                    if (instance.cellIndex !== undefined) {
                        const cell = document.querySelector(`.sound-cell[data-index="${instance.cellIndex}"]`);
                        if (cell) {
                            cell.classList.remove('active', 'playing-feedback');
                        }
                    }
                }
            }
            // Disconnect nodes after a short delay to allow the fade to start
            setTimeout(() => {
                try {
                    if (instance.source && instance.source.disconnect) {
                        instance.source.disconnect();
                    }
                    if (instance.gain && instance.gain.disconnect) {
                        instance.gain.disconnect();
                    }
                } catch (disconnectError) {
                    console.warn("Erro ao desconectar nós de áudio:", disconnectError);
                }
            }, (fadeDuration * 1000) + 100); // Wait a bit more than the fade duration
        } else {
             console.warn("Instância de som inválida ou incompleta:", instance);
        }
    }


    function fadeoutSound(index, duration, soundData, audioContextParam, globalActivePlayingInstances) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (!currentAudioContext) return;
        const sound = soundData[index];
        if (!sound || sound.activePlayingInstances.size === 0) return;

        const now = currentAudioContext.currentTime;
        // Clone set to iterate safely, as instances might be removed during iteration
        const instancesToFade = new Set(sound.activePlayingInstances);

        instancesToFade.forEach(instance => {
            stopSoundInstance(instance, now, duration);
            sound.activePlayingInstances.delete(instance); // Remove from sound's specific instances
            globalActivePlayingInstances.delete(instance); // Remove from global instances
        });

        // The class removal for the cell will be handled by stopSoundInstance's timeout
        // once the last instance of that sound finishes fading.
        // So, we don't need to do `cell.classList.remove` directly here.
    }

    /**
     * Para todos os sons a tocar, opcionalmente com um fade out.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     * @param {Array} soundData - O array de dados de som global.
     * @param {number} [fadeDuration=0] - A duração do fade out em segundos. Padrão é 0 (paragem imediata).
     */
    function stopAllSounds(audioContextParam, globalActivePlayingInstances, soundData, fadeDuration = 0) { // <--- ALTERAÇÃO AQUI: Adicionado fadeDuration com valor padrão
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (!currentAudioContext) {
            console.warn("AudioContext não disponível para parar todos os sons.");
            return;
        }

        const now = currentAudioContext.currentTime;
        // A fadeDuration é agora um parâmetro, não mais uma constante fixa aqui.

        // Clone set to iterate safely, as instances might be removed during iteration
        const instancesToStop = new Set(globalActivePlayingInstances);

        instancesToStop.forEach(instance => {
            stopSoundInstance(instance, now, fadeDuration); // <--- Usando o fadeDuration do parâmetro
        });

        // Ensure the global set is cleared after all attempts to stop
        globalActivePlayingInstances.clear();

        // Also remove 'active' and 'playing-feedback' classes from all cells
        document.querySelectorAll('.sound-cell.active, .sound-cell.playing-feedback').forEach(cell => {
            cell.classList.remove('active', 'playing-feedback');
        });

        // Ensure individual sound active instances are also cleared
        soundData.forEach(sound => {
            if (sound && sound.activePlayingInstances) {
                sound.activePlayingInstances.clear();
            }
        });
        lastPlayedSoundIndex = null; // Reset last played index
        console.log("Todos os sons parados e instâncias limpas.");
    }

    function clearSoundCell(index, fadeDuration, soundData, audioContextParam, globalActivePlayingInstances, updateCellDisplay, getTranslation, saveSettingsCallback) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (!soundData[index]) return;

        fadeoutSound(index, fadeDuration, soundData, currentAudioContext, globalActivePlayingInstances);

        // Clear sound data after fade out (or immediately if no fade)
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            // Use window.soundboardApp.defaultKeys[index] for the key
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[index] || '', isLooping: false, isCued: false }, true, getTranslation);
            cell.classList.remove('active', 'playing-feedback'); // Ensure visual state is clean
        }

        clearSoundData(index, soundData, currentAudioContext, globalActivePlayingInstances);
        saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
    }

    function clearAllSoundCells(soundData, audioContextParam, globalActivePlayingInstances, NUM_CELLS, updateCellDisplay, getTranslation, saveSettingsCallback) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        // const fadeDuration = 0.2; // Esta constante não é mais usada aqui, pois stopAllSounds recebe a sua própria duração

        // Stop all currently playing sounds (agora com um fade de 0.2s padrão para esta função)
        stopAllSounds(currentAudioContext, globalActivePlayingInstances, soundData, 0.2); // Passa 0.2s para fade out aqui

        // Then clear the data for each cell
        for (let i = 0; i < NUM_CELLS; i++) {
            if (soundData[i]) { // Only process if there's actually data
                const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                // Clear the sound data for the cell
                clearSoundData(i, soundData, currentAudioContext, globalActivePlayingInstances);
                // Update the cell's display to empty
                if (cell) {
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
                    cell.classList.remove('active', 'playing-feedback'); // Ensure visual state is clean for cleared cells
                }
            }
        }
        // Also clear all cues
        window.soundboardApp.cueGoSystem.removeAllCues(soundData);
        // Save settings after all cells are cleared
        saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        console.log("Todas as células limpas.");
    }


    function clearSoundData(index, soundData, audioContextParam, globalActivePlayingInstances) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (soundData[index]) {
            // Ensure any remaining active instances are properly stopped and disconnected
            if (soundData[index].activePlayingInstances.size > 0) {
                const now = currentAudioContext.currentTime;
                soundData[index].activePlayingInstances.forEach(instance => {
                    stopSoundInstance(instance, now, 0.05); // Quick stop for cleanup
                    globalActivePlayingInstances.delete(instance);
                });
                soundData[index].activePlayingInstances.clear();
            }
            soundData[index] = null;
        }
    }

    function getLastPlayedSoundIndex() {
        return lastPlayedSoundIndex;
    }

    function setLastPlayedSoundIndex(index) {
        lastPlayedSoundIndex = index;
    }


    return {
        initAudioContext: initAudioContext,
        loadFileIntoCell: loadFileIntoCell,
        loadSoundFromDataURL: loadSoundFromDataURL,
        loadMultipleFilesIntoCells: loadMultipleFilesIntoCells,
        playSound: playSound,
        fadeoutSound: fadeoutSound,
        stopAllSounds: stopAllSounds, // Agora aceita um fadeDuration
        clearSoundCell: clearSoundCell,
        clearAllSoundCells: clearAllSoundCells,
        clearSoundData: clearSoundData,
        getLastPlayedSoundIndex: getLastPlayedSoundIndex,
        setLastPlayedSoundIndex: setLastPlayedSoundIndex
    };
})();
