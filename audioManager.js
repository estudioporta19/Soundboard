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

    function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Carrega um som a partir de uma Data URL e o armazena no IndexedDB.
     * @param {string} audioDataUrl - A Data URL do áudio.
     * @param {HTMLElement} cell - O elemento da célula HTML.
     * @param {number} index - O índice da célula.
     * @param {string} name - O nome do som.
     * @param {string} key - A tecla associada.
     * @param {string} color - A cor da célula.
     * @param {boolean} isLooping - Se o som deve fazer loop.
     * @param {boolean} isCued - Se o som está 'cued'.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações (não mais necessário aqui para IndexedDB).
     */
    async function loadSoundFromDataURL(audioDataUrl, cell, index, name, key, color, isLooping, isCued, soundData, audioContextParam, updateCellDisplay, getTranslation, saveSettingsCallback) {
        initAudioContext(window.soundboardApp.volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        if (!currentAudioContext) {
            console.error("AudioContext não inicializado ao tentar carregar som da Data URL.");
            return;
        }

        if (!audioDataUrl || typeof audioDataUrl !== 'string' || !audioDataUrl.startsWith('data:audio')) {
            console.error(`audioDataUrl inválida para célula ${index}:`, audioDataUrl);
            // Se a Data URL é inválida, tratamos a célula como vazia e tentamos remover do DB
            await window.soundboardApp.indexedDBManager.deleteAudio(index);
            clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: key || '', isLooping: false, isCued: false }, true, getTranslation);
            // saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible); // Não precisa salvar settings aqui, a responsabilidade é do IndexedDBManager
            return;
        }

        const arrayBuffer = base64ToArrayBuffer(audioDataUrl.split(',')[1]);

        try {
            console.log(`[loadSoundFromDataURL] Tentando decodificar Data URL para célula ${index}...`);
            const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer);
            console.log(`[loadSoundFromDataURL] Sucesso na decodificação de Data URL para célula ${index}. Duração: ${audioBuffer.duration}s`);

            if (soundData[index]) {
                clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            }

            soundData[index] = {
                name: name,
                key: key,
                audioBuffer: audioBuffer,
                audioDataUrl: audioDataUrl, // Keep Data URL for saving to DB
                activePlayingInstances: new Set(),
                color: color,
                isLooping: isLooping,
                isCued: isCued
            };
            updateCellDisplay(cell, soundData[index], false, getTranslation);
            
            // Salvar no IndexedDB
            await window.soundboardApp.indexedDBManager.saveAudio(index, audioDataUrl, name, key, color, isLooping, isCued);

        } catch (error) {
            console.error(`[loadSoundFromDataURL] ERRO FATAL ao decodificar o áudio da Data URL para célula ${index}:`, error);
            alert(getTranslation('alertDecodeError').replace('{soundName}', name || 'N/A') + `\nDetalhes: ${error.message}`);
            // Se falhou ao decodificar, garanta que a célula está limpa e remova do DB
            await window.soundboardApp.indexedDBManager.deleteAudio(index);
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: key || '', isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
        }
    }

    /**
     * Carrega um ficheiro de áudio para uma célula e o armazena no IndexedDB.
     * @param {File} file - O objeto File a ser carregado.
     * @param {HTMLElement} cell - O elemento da célula HTML.
     * @param {number} index - O índice da célula.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações (não mais necessário aqui).
     */
    async function loadFileIntoCell(file, cell, index, soundData, audioContextParam, updateCellDisplay, getTranslation, saveSettingsCallback) {
        initAudioContext(window.soundboardApp.volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        if (!currentAudioContext) {
            console.error("[loadFileIntoCell] AudioContext não inicializado ao tentar carregar ficheiro.");
            alert(getTranslation('alertLoadError').replace('{fileName}', file.name) + " (AudioContext não pronto)");
            return;
        }

        console.log(`[loadFileIntoCell] Iniciando carregamento para ficheiro: ${file.name}, Tipo: ${file.type}, Tamanho: ${file.size} bytes`);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const audioDataUrl = e.target.result;
            console.log(`[loadFileIntoCell] FileReader carregou Data URL para ${file.name}. Tamanho da Data URL: ${audioDataUrl.length} caracteres.`);
            
            try {
                const arrayBuffer = base64ToArrayBuffer(audioDataUrl.split(',')[1]);
                console.log(`[loadFileIntoCell] ArrayBuffer criado para ${file.name}. Tamanho do buffer: ${arrayBuffer.byteLength} bytes.`);
                
                console.log(`[loadFileIntoCell] Tentando decodificar áudio para ${file.name}...`);
                const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer)
                    .then(buffer => {
                        console.log(`[loadFileIntoCell] Sucesso na decodificação de ${file.name}. Duração: ${buffer.duration} segundos.`);
                        return buffer;
                    })
                    .catch(error => {
                        console.error(`[loadFileIntoCell] ERRO NA DECODIFICAÇÃO para ${file.name}:`, error);
                        alert(getTranslation('alertDecodeError').replace('{soundName}', file.name) + `\nDetalhes: ${error.message}`);
                        return null;
                    });

                if (!audioBuffer) {
                    console.warn(`[loadFileIntoCell] AudioBuffer não criado para ${file.name}. Abortando carregamento para célula ${index}.`);
                    // Se a decodificação falhou, limpe a célula e remova do DB
                    await window.soundboardApp.indexedDBManager.deleteAudio(index);
                    const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
                    soundData[index] = null;
                    return;
                }

                const fixedKey = window.soundboardApp.defaultKeys[index];
                const defaultName = file.name.replace(/\.[^/.]+$/, "");
                const cellColor = window.soundboardApp.utils.getRandomHSLColor();

                if (soundData[index]) {
                    clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
                }

                soundData[index] = {
                    name: defaultName,
                    key: fixedKey,
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl, // Save the Data URL string here
                    activePlayingInstances: new Set(),
                    color: cellColor,
                    isLooping: false,
                    isCued: false
                };
                updateCellDisplay(cell, soundData[index], false, getTranslation);
                
                // Salvar no IndexedDB
                await window.soundboardApp.indexedDBManager.saveAudio(index, audioDataUrl, defaultName, fixedKey, cellColor, false, false);
                
                console.log(`[loadFileIntoCell] Ficheiro ${file.name} carregado com sucesso na célula ${index} e salvo no IndexedDB.`);

            } catch (error) {
                console.error(`[loadFileIntoCell] ERRO GERAL no processamento do áudio para célula ${index} (${file.name}):`, error);
                alert(getTranslation('alertLoadError').replace('{fileName}', file.name) + `\nDetalhes: ${error.message}`);
                // Se erro geral, limpe a célula e remova do DB
                await window.soundboardApp.indexedDBManager.deleteAudio(index);
                const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
                soundData[index] = null;
            }
        };
        reader.onerror = async (error) => {
            console.error(`[loadFileIntoCell] Erro no FileReader ao carregar ${file.name}:`, error);
            alert(getTranslation('alertLoadError').replace('{fileName}', file.name) + `\nErro de leitura: ${error.message}`);
            // Se erro no reader, limpe a célula e remova do DB
            await window.soundboardApp.indexedDBManager.deleteAudio(index);
            const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Carrega múltiplos ficheiros de áudio em células sequenciais a partir de um índice de início.
     * @param {File[]} files - Um array de objetos File a serem carregados.
     * @param {number} startIndex - O índice da célula a partir da qual o carregamento deve começar.
     * @param {Array} soundData - O array de dados de som global.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações (não mais necessário aqui).
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
                break;
            }

            const cell = document.querySelector(`.sound-cell[data-index="${currentIndex}"]`);
            if (cell) {
                // await para garantir que o arquivo seja processado antes de passar para o próximo
                await loadFileIntoCell(file, cell, currentIndex, soundData, currentAudioContext, updateCellDisplay, getTranslation, saveSettingsCallback);
            } else {
                console.warn(`Célula com índice ${currentIndex} não encontrada. Ignorando ficheiro ${file.name}.`);
            }
            currentIndex++;
        }
        // Após carregar múltiplos, podemos querer salvar as configurações gerais, mas os áudios já foram salvos individualmente
        // saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible); // Não é mais estritamente necessário aqui
    }

    // NOVA FUNÇÃO: Carrega todos os áudios do IndexedDB na inicialização
    async function loadAllAudiosFromIndexedDB(soundData, audioContextParam, updateCellDisplay, getTranslation) {
        initAudioContext(window.soundboardApp.volumeRange); // Garante que o contexto de áudio esteja pronto
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        if (!currentAudioContext) {
            console.error("AudioContext não inicializado ao tentar carregar todos os áudios do IndexedDB.");
            return;
        }

        try {
            console.log("Tentando carregar todos os áudios do IndexedDB...");
            const storedAudios = await window.soundboardApp.indexedDBManager.getAllAudios();
            
            // Garante que o soundData array tem o tamanho correto e está preenchido com nulos
            for (let i = 0; i < window.soundboardApp.NUM_CELLS; i++) {
                soundData[i] = null;
            }

            for (const audio of storedAudios) {
                const index = audio.index;
                // Ignorar áudios com índice fora do limite esperado
                if (index < 0 || index >= window.soundboardApp.NUM_CELLS) {
                    console.warn(`Áudio com índice inválido ${index} encontrado no IndexedDB. Ignorando.`);
                    continue;
                }
                const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                if (cell) {
                    // Reutilizar loadSoundFromDataURL para decodificar e popular soundData
                    // Passamos null para saveSettingsCallback porque o IndexedDB já é a fonte
                    await loadSoundFromDataURL(audio.audioDataUrl, cell, index, audio.name, audio.key, audio.color, audio.isLooping, audio.isCued, soundData, currentAudioContext, updateCellDisplay, getTranslation, null);
                } else {
                    console.warn(`Célula com índice ${index} não encontrada para áudio do IndexedDB. Pulando.`);
                }
            }
            console.log(`Carregamento de ${storedAudios.length} áudios do IndexedDB concluído.`);
        } catch (error) {
            console.error("Erro ao carregar todos os áudios do IndexedDB:", error);
            alert(getTranslation('alertGetAudioDbError') + `\nDetalhes: ${error.message}`);
        }
    }


    function playSound(index, soundData, audioContextParam, playMultipleCheckbox, autokillModeCheckbox, globalActivePlayingInstances, currentFadeInDuration, currentFadeOutDuration, volumeRange) {
        initAudioContext(volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) cell.classList.remove('active', 'playing-feedback');
            console.log(`Célula ${index} vazia ou áudio não carregado.`);
            return false;
        }

        const now = currentAudioContext.currentTime;

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('playing-feedback');
        }

        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            const prevSound = soundData[lastPlayedSoundIndex];
            if (prevSound && prevSound.activePlayingInstances.size > 0) {
                 prevSound.activePlayingInstances.forEach(instance => {
                    stopSoundInstance(instance, now, 0.1);
                 });
                 prevSound.activePlayingInstances.clear();
            }
            const prevCell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
            if (prevCell) {
                prevCell.classList.remove('active', 'playing-feedback');
            }
        }

        if (!playMultipleCheckbox.checked && sound.activePlayingInstances.size > 0) {
            sound.activePlayingInstances.forEach(instance => {
                stopSoundInstance(instance, now, currentFadeOutDuration);
            });
            sound.activePlayingInstances.clear();
        }

        const source = currentAudioContext.createBufferSource();
        source.buffer = sound.audioBuffer;
        source.loop = sound.isLooping;

        const gainNode = currentAudioContext.createGain();
        gainNode.gain.value = 0.001;

        source.connect(gainNode);
        gainNode.connect(masterGainNode);

        const initialVolume = window.soundboardApp.volumeRange.value;

        if (currentFadeInDuration > 0) {
            gainNode.gain.linearRampToValueAtTime(initialVolume, now + currentFadeInDuration);
        } else {
            gainNode.gain.setValueAtTime(initialVolume, now);
        }

        source.start(now);

        const activeInstance = { source: source, gain: gainNode, startTime: now, soundDataEntry: sound, cellIndex: index };
        sound.activePlayingInstances.add(activeInstance);
        globalActivePlayingInstances.add(activeInstance);

        source.onended = () => {
            sound.activePlayingInstances.delete(activeInstance);
            globalActivePlayingInstances.delete(activeInstance);
            if (cell && sound.activePlayingInstances.size === 0) {
                cell.classList.remove('active', 'playing-feedback');
            }
        };

        if (cell) {
            cell.classList.add('active');
            if (!sound.isLooping) {
                setTimeout(() => {
                    if (!sound.isLooping && sound.activePlayingInstances.size === 0) {
                           cell.classList.remove('active', 'playing-feedback');
                    }
                }, (sound.audioBuffer.duration + currentFadeInDuration) * 1000 + 50);
            }
        }

        lastPlayedSoundIndex = index;
        return true;
    }

    function stopSoundInstance(instance, now, fadeDuration) {
        if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
            try {
                instance.gain.gain.cancelScheduledValues(now);
                instance.gain.gain.setValueAtTime(instance.gain.gain.value, now);
                instance.gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

                instance.source.stop(now + fadeDuration + 0.05);
                instance.source.onended = null;

                if (instance.cellIndex !== undefined) {
                    const cell = document.querySelector(`.sound-cell[data-index="${instance.cellIndex}"]`);
                    setTimeout(() => {
                        if (cell && instance.soundDataEntry && instance.soundDataEntry.activePlayingInstances.size === 0) {
                            cell.classList.remove('active', 'playing-feedback');
                        }
                    }, (fadeDuration * 1000) + 100);
                }

            } catch (error) {
                console.warn("Erro ao parar instância de som ou aplicar fade-out:", error);
                if (instance.source && typeof instance.source.stop === 'function') {
                    instance.source.stop();
                    if (instance.cellIndex !== undefined) {
                        const cell = document.querySelector(`.sound-cell[data-index="${instance.cellIndex}"]`);
                        if (cell) {
                            cell.classList.remove('active', 'playing-feedback');
                        }
                    }
                }
            }
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
            }, (fadeDuration * 1000) + 100);
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
        const instancesToFade = new Set(sound.activePlayingInstances);

        instancesToFade.forEach(instance => {
            stopSoundInstance(instance, now, duration);
            sound.activePlayingInstances.delete(instance);
            globalActivePlayingInstances.delete(instance);
        });
    }

    /**
     * Para todos os sons a tocar, opcionalmente com um fade out.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     * @param {Array} soundData - O array de dados de som global.
     * @param {number} [fadeDuration=0] - A duração do fade out em segundos. Padrão é 0 (paragem imediata).
     */
    function stopAllSounds(audioContextParam, globalActivePlayingInstances, soundData, fadeDuration = 0) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (!currentAudioContext) {
            console.warn("AudioContext não disponível para parar todos os sons.");
            return;
        }

        const now = currentAudioContext.currentTime;
        const instancesToStop = new Set(globalActivePlayingInstances);

        instancesToStop.forEach(instance => {
            stopSoundInstance(instance, now, fadeDuration);
        });

        globalActivePlayingInstances.clear();

        document.querySelectorAll('.sound-cell.active, .sound-cell.playing-feedback').forEach(cell => {
            cell.classList.remove('active', 'playing-feedback');
        });

        soundData.forEach(sound => {
            if (sound && sound.activePlayingInstances) {
                sound.activePlayingInstances.clear();
            }
        });
        lastPlayedSoundIndex = null;
        console.log("Todos os sons parados e instâncias limpas.");
    }

    /**
     * Limpa uma célula de som, parando o áudio e removendo-o do IndexedDB.
     * @param {number} index - O índice da célula a ser limpa.
     * @param {number} fadeDuration - Duração do fade out para o som.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações (não mais necessário aqui).
     */
    async function clearSoundCell(index, fadeDuration, soundData, audioContextParam, globalActivePlayingInstances, updateCellDisplay, getTranslation, saveSettingsCallback) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (!soundData[index]) return;

        fadeoutSound(index, fadeDuration, soundData, currentAudioContext, globalActivePlayingInstances);

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[index] || '', isLooping: false, isCued: false }, true, getTranslation);
            cell.classList.remove('active', 'playing-feedback');
        }

        clearSoundData(index, soundData, currentAudioContext, globalActivePlayingInstances);
        
        // Excluir do IndexedDB
        await window.soundboardApp.indexedDBManager.deleteAudio(index);
        // saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible); // Não precisa salvar settings aqui
    }

    /**
     * Limpa todas as células de som, parando todos os áudios e limpando o IndexedDB.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     * @param {number} NUM_CELLS - Número total de células.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações (não mais necessário aqui).
     */
    async function clearAllSoundCells(soundData, audioContextParam, globalActivePlayingInstances, NUM_CELLS, updateCellDisplay, getTranslation, saveSettingsCallback) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        
        stopAllSounds(currentAudioContext, globalActivePlayingInstances, soundData, 0.2);

        for (let i = 0; i < NUM_CELLS; i++) {
            if (soundData[i]) {
                const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                clearSoundData(i, soundData, currentAudioContext, globalActivePlayingInstances);
                if (cell) {
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
                    cell.classList.remove('active', 'playing-feedback');
                }
            }
        }
        window.soundboardApp.cueGoSystem.removeAllCues(soundData);

        // Limpar todos os áudios do IndexedDB
        await window.soundboardApp.indexedDBManager.clearAllAudios();
        // saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible); // Não precisa salvar settings aqui
        console.log("Todas as células limpas e IndexedDB esvaziado.");
    }


    function clearSoundData(index, soundData, audioContextParam, globalActivePlayingInstances) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (soundData[index]) {
            if (soundData[index].activePlayingInstances.size > 0) {
                const now = currentAudioContext.currentTime;
                soundData[index].activePlayingInstances.forEach(instance => {
                    stopSoundInstance(instance, now, 0.05);
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
        loadAllAudiosFromIndexedDB: loadAllAudiosFromIndexedDB, // NOVO: Para carregar do IndexedDB na inicialização
        playSound: playSound,
        fadeoutSound: fadeoutSound,
        stopAllSounds: stopAllSounds,
        clearSoundCell: clearSoundCell,
        clearAllSoundCells: clearAllSoundCells,
        clearSoundData: clearSoundData,
        getLastPlayedSoundIndex: getLastPlayedSoundIndex,
        setLastPlayedSoundIndex: setLastPlayedSoundIndex
    };
})();
