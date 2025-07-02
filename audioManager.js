// audioManager.js
// Gerencia a inicialização do AudioContext, carregamento e reprodução de sons.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.audioManager = (function() {
    let audioContext;
    let masterGainNode; // Master gain node for global volume control
    let lastPlayedSoundIndex = null; // To manage autokill and QLab-style navigation

    /**
     * Inicializa o AudioContext e o Master Gain Node se ainda não o fez.
     * @param {HTMLInputElement} volumeRange - O elemento input range para o volume global.
     */
    function initAudioContext(volumeRange) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
            masterGainNode.gain.value = parseFloat(volumeRange.value); // Garante que é um número
            window.soundboardApp.audioContext = audioContext; // Make it globally accessible
            window.soundboardApp.masterGainNode = masterGainNode; // Make masterGainNode globally accessible
            console.log("AudioContext inicializado.");
        }
    }

    /**
     * Carrega um ficheiro de áudio para uma célula e armazena-o no IndexedDB.
     * Armazena apenas o ID do IndexedDB e metadados na soundData.
     * @param {File} file - O objeto File a ser carregado.
     * @param {HTMLElement} cell - O elemento DOM da célula de som.
     * @param {number} index - O índice da célula.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações.
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

        // Gere um ID único para este som no IndexedDB
        const soundId = `sound-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        try {
            // 1. Salve o ficheiro (Blob) no IndexedDB
            await window.soundboardApp.dbManager.saveSoundFile(soundId, file);
            console.log(`[loadFileIntoCell] Ficheiro ${file.name} guardado no IndexedDB com ID: ${soundId}`);

            // 2. Decodifique o áudio para o AudioBuffer para uso IMEDIATO (cache temporário)
            const audioBlobUrl = URL.createObjectURL(file);
            const response = await fetch(audioBlobUrl);
            const arrayBuffer = await response.arrayBuffer();
            URL.revokeObjectURL(audioBlobUrl); // Libere o URL do objeto assim que o buffer for lido

            console.log(`[loadFileIntoCell] Tentando decodificar áudio para ${file.name} para o AudioBuffer...`);
            const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer)
                .then(buffer => {
                    console.log(`[loadFileIntoCell] Sucesso na decodificação de ${file.name}. Duração: ${buffer.duration} segundos.`);
                    return buffer;
                })
                .catch(error => {
                    console.error(`[loadFileIntoCell] ERRO NA DECODIFICAÇÃO para ${file.name}:`, error);
                    alert(getTranslation('alertAudioDecodeError').replace('{fileName}', file.name) + `\nDetalhes: ${error.message}`);
                    return null; // Retorna null para indicar falha
                });

            if (!audioBuffer) {
                console.warn(`[loadFileIntoCell] AudioBuffer não criado para ${file.name}. Abortando carregamento para célula ${index}.`);
                const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
                soundData[index] = null; // Garante que o slot está vazio
                await window.soundboardApp.dbManager.deleteSoundFile(soundId); // Limpa do IndexedDB
                saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
                return;
            }

            // Obter fixedKey do array global defaultKeys
            const fixedKey = window.soundboardApp.defaultKeys[index];
            const defaultName = file.name.replace(/\.[^/.]+$/, "");
            const cellColor = window.soundboardApp.utils.getRandomHSLColor();

            if (soundData[index]) {
                // Se já havia um som, remova o antigo do IndexedDB
                if (soundData[index].soundFileId) {
                    await window.soundboardApp.dbManager.deleteSoundFile(soundData[index].soundFileId);
                }
                clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            }

            // 3. Armazene apenas os metadados e o ID do som na soundData
            soundData[index] = {
                name: defaultName,
                key: fixedKey,
                soundFileId: soundId, // Este é o único link persistente para o áudio
                _audioBufferCache: audioBuffer, // Cache para reprodução imediata, não serializado
                activePlayingInstances: new Set(),
                color: cellColor,
                isLooping: false,
                isCued: false
            };
            updateCellDisplay(cell, soundData[index], false, getTranslation);
            saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
            console.log(`[loadFileIntoCell] Ficheiro ${file.name} carregado com sucesso na célula ${index} (ID: ${soundId}).`);
        } catch (error) {
            console.error(`[loadFileIntoCell] ERRO GERAL no processamento do áudio para célula ${index} (${file.name}):`, error);
            alert(getTranslation('alertLoadError').replace('{fileName}', file.name) + `\nDetalhes: ${error.message}`);
            const fallbackKey = window.soundboardApp.defaultKeys[index] || '';
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fallbackKey, isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
            // Tenta remover do IndexedDB em caso de falha de carregamento também
            await window.soundboardApp.dbManager.deleteSoundFile(soundId);
            saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        }
    }

    /**
     * Carrega um som a partir do IndexedDB para uma célula (usado para carregar sessões salvas).
     * @param {string} soundId - O ID do som no IndexedDB.
     * @param {HTMLElement} cell - O elemento DOM da célula de som.
     * @param {number} index - O índice da célula.
     * @param {string} name - O nome do som.
     * @param {string} key - A tecla associada ao som.
     * @param {string} color - A cor da célula.
     * @param {boolean} isLooping - Se o som deve repetir.
     * @param {boolean} isCued - Se o som está "cued" para a próxima reprodução.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações.
     */
    async function loadSoundFromIndexedDB(soundId, cell, index, name, key, color, isLooping, isCued, soundData, audioContextParam, updateCellDisplay, getTranslation, saveSettingsCallback) {
        initAudioContext(window.soundboardApp.volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        if (!currentAudioContext) {
            console.error("AudioContext não inicializado ao tentar carregar som do IndexedDB.");
            return;
        }

        if (!soundId) {
            console.warn(`soundId inválido para célula ${index}. Limpando célula.`);
            if (soundData[index]) {
                clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            }
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: key || '', isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
            // saveSettingsCallback não é chamado aqui, pois é parte de um loop de carregamento de sessão
            return;
        }

        try {
            console.log(`[loadSoundFromIndexedDB] Tentando obter ficheiro de áudio com ID: ${soundId} para célula ${index}...`);
            const audioBlob = await window.soundboardApp.dbManager.getSoundFile(soundId);

            if (!audioBlob) {
                console.warn(`Ficheiro de áudio com ID ${soundId} não encontrado no IndexedDB para célula ${index}. Limpando célula.`);
                if (soundData[index]) {
                    clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
                }
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: key || '', isLooping: false, isCued: false }, true, getTranslation);
                soundData[index] = null;
                return;
            }

            const audioBlobUrl = URL.createObjectURL(audioBlob);
            const response = await fetch(audioBlobUrl);
            const arrayBuffer = await response.arrayBuffer();
            URL.revokeObjectURL(audioBlobUrl); // Liberar o URL do objeto

            console.log(`[loadSoundFromIndexedDB] Sucesso ao obter ficheiro de áudio do IndexedDB para ${name || 'N/A'}. Decodificando...`);
            const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer);
            console.log(`[loadSoundFromIndexedDB] Sucesso na decodificação de áudio para célula ${index}. Duração: ${audioBuffer.duration}s`);

            if (soundData[index]) {
                clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            }

            soundData[index] = {
                name: name,
                key: key,
                soundFileId: soundId,
                _audioBufferCache: audioBuffer, // Cache do AudioBuffer para reprodução
                activePlayingInstances: new Set(),
                color: color,
                isLooping: isLooping,
                isCued: isCued
            };
            updateCellDisplay(cell, soundData[index], false, getTranslation);
            // saveSettingsCallback não é chamado aqui, pois é parte de um loop de carregamento de sessão
        } catch (error) {
            console.error(`[loadSoundFromIndexedDB] ERRO FATAL ao decodificar o áudio do IndexedDB para célula ${index} (${soundId}):`, error);
            alert(getTranslation('alertDecodeError').replace('{soundName}', name || 'N/A') + `\nDetalhes: ${error.message}`);
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: key || '', isLooping: false, isCued: false }, true, getTranslation);
            soundData[index] = null;
            // saveSettingsCallback não é chamado aqui
        }
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
                // Passa o saveSettingsCallback para que cada carregamento individual salve
                await loadFileIntoCell(file, cell, currentIndex, soundData, currentAudioContext, updateCellDisplay, getTranslation, saveSettingsCallback);
            } else {
                console.warn(`Célula com índice ${currentIndex} não encontrada. Ignorando ficheiro ${file.name}.`);
            }
            currentIndex++; // Move para a próxima célula
        }
    }

    /**
     * Tenta reproduzir um som de uma célula específica. Primeiro verifica o cache, depois o IndexedDB.
     * @param {number} index - O índice da célula de som.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {HTMLInputElement} playMultipleCheckbox - O checkbox de reprodução múltipla.
     * @param {HTMLInputElement} autokillModeCheckbox - O checkbox do modo autokill.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     * @param {number} currentFadeInDuration - Duração do fade-in em segundos.
     * @param {number} currentFadeOutDuration - Duração do fade-out em segundos.
     * @param {HTMLInputElement} volumeRange - O elemento input range para o volume global.
     * @returns {Promise<boolean>} Retorna true se o som foi reproduzido, false caso contrário.
     */
    async function playSound(index, soundData, audioContextParam, playMultipleCheckbox, autokillModeCheckbox, globalActivePlayingInstances, currentFadeInDuration, currentFadeOutDuration, volumeRange) {
        initAudioContext(volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        const sound = soundData[index];
        if (!sound || (!sound._audioBufferCache && !sound.soundFileId)) {
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) cell.classList.remove('active', 'playing-feedback');
            console.log(`Célula ${index} vazia ou áudio não carregado.`);
            return false;
        }

        let audioBufferToPlay = sound._audioBufferCache;

        // Se o cache estiver vazio (ex: após recarregar a página), recarregue do IndexedDB
        if (!audioBufferToPlay && sound.soundFileId) {
            try {
                console.log(`[playSound] Recarregando áudio para ${sound.name} (ID: ${sound.soundFileId}) do IndexedDB.`);
                const audioBlob = await window.soundboardApp.dbManager.getSoundFile(sound.soundFileId);
                if (!audioBlob) {
                    console.error(`[playSound] Ficheiro de áudio com ID ${sound.soundFileId} não encontrado no IndexedDB. Limpando célula.`);
                    // Chame clearSoundCell de forma assíncrona, não espere por ela aqui
                    // Nota: Passar callbacks para funções que não estão no mesmo escopo
                    // requer que elas sejam passadas como parâmetros ou acessíveis globalmente
                    window.soundboardApp.audioManager.clearSoundCell(index, 0, soundData, currentAudioContext, globalActivePlayingInstances, window.soundboardApp.cellManager.updateCellDisplay, window.soundboardApp.i18n.getTranslation, window.soundboardApp.settingsManager.saveSettings);
                    return false;
                }

                const audioBlobUrl = URL.createObjectURL(audioBlob);
                const response = await fetch(audioBlobUrl);
                const arrayBuffer = await response.arrayBuffer();
                URL.revokeObjectURL(audioBlobUrl);

                audioBufferToPlay = await currentAudioContext.decodeAudioData(arrayBuffer);
                sound._audioBufferCache = audioBufferToPlay; // Cache o buffer para usos futuros
            } catch (error) {
                console.error(`[playSound] Erro ao recarregar áudio do IndexedDB para ${sound.name}:`, error);
                window.soundboardApp.audioManager.clearSoundCell(index, 0, soundData, currentAudioContext, globalActivePlayingInstances, window.soundboardApp.cellManager.updateCellDisplay, window.soundboardApp.i18n.getTranslation, window.soundboardApp.settingsManager.saveSettings);
                return false;
            }
        }

        // Se, mesmo após a tentativa de recarga, não houver audioBufferToPlay, algo falhou.
        if (!audioBufferToPlay) {
            console.error(`Não foi possível obter AudioBuffer para célula ${index} (${sound.name}).`);
            return false;
        }

        const now = currentAudioContext.currentTime;

        // Get the cell element for visual feedback
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('playing-feedback'); // Add the class right at the start of playback
        }

        // Auto-kill previous sound if enabled and not playing multiple
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            const prevSound = soundData[lastPlayedSoundIndex];
            if (prevSound && prevSound.activePlayingInstances.size > 0) {
                prevSound.activePlayingInstances.forEach(instance => {
                    stopSoundInstance(instance, now, 0.1); // Quick fade out for previous sound
                });
                prevSound.activePlayingInstances.clear(); // Clear all instances from this sound
            }
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

        const source = currentAudioContext.createBufferSource();
        source.buffer = audioBufferToPlay; // Usando o buffer obtido/cached
        source.loop = sound.isLooping;

        const gainNode = currentAudioContext.createGain();
        gainNode.gain.value = 0.001; // Start from near silent for fade-in

        source.connect(gainNode);
        gainNode.connect(masterGainNode); // Connect to the master gain

        const initialVolume = parseFloat(window.soundboardApp.volumeRange.value); // Garante que é um número

        if (currentFadeInDuration > 0) {
            gainNode.gain.linearRampToValueAtTime(initialVolume, now + currentFadeInDuration);
        } else {
            gainNode.gain.setValueAtTime(initialVolume, now); // Immediate start
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
                }, (audioBufferToPlay.duration + currentFadeInDuration) * 1000 + 50);
            }
        }

        lastPlayedSoundIndex = index;
        return true;
    }

    /**
     * Para uma instância de som específica com um fade-out.
     * @param {Object} instance - A instância do som a ser parado.
     * @param {number} now - O tempo atual do AudioContext.
     * @param {number} fadeDuration - A duração do fade-out em segundos.
     */
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
                        // Só remove as classes se não houver mais instâncias ativas para aquele som
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

    /**
     * Aplica fade-out e para todos os sons ativos numa célula específica.
     * @param {number} index - O índice da célula.
     * @param {number} duration - Duração do fade-out em segundos.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     */
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
     * Limpa uma célula de som específica, parando os sons e removendo os dados.
     * @param {number} index - O índice da célula a ser limpa.
     * @param {number} fadeDuration - Duração do fade-out em segundos para os sons a parar.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações.
     */
    async function clearSoundCell(index, fadeDuration, soundData, audioContextParam, globalActivePlayingInstances, updateCellDisplay, getTranslation, saveSettingsCallback) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;
        if (!soundData[index]) return;

        // Primeiro, pare o som com fade-out
        fadeoutSound(index, fadeDuration, soundData, currentAudioContext, globalActivePlayingInstances);

        // Se houver um soundFileId, exclua o ficheiro de áudio do IndexedDB
        if (soundData[index].soundFileId) {
            try {
                await window.soundboardApp.dbManager.deleteSoundFile(soundData[index].soundFileId);
                console.log(`Ficheiro de áudio com ID ${soundData[index].soundFileId} excluído do IndexedDB.`);
            } catch (error) {
                console.error(`Erro ao excluir ficheiro do IndexedDB para célula ${index}:`, error);
            }
        }

        // Limpar dados da célula
        clearSoundData(index, soundData, currentAudioContext, globalActivePlayingInstances);

        // Atualizar display da célula
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[index] || '', isLooping: false, isCued: false }, true, getTranslation);
            cell.classList.remove('active', 'playing-feedback');
        }

        saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
    }

    /**
     * Limpa todas as células de som, parando os sons e removendo todos os dados.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     * @param {number} NUM_CELLS - O número total de células.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações.
     */
    async function clearAllSoundCells(soundData, audioContextParam, globalActivePlayingInstances, NUM_CELLS, updateCellDisplay, getTranslation, saveSettingsCallback) {
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        // Pare todos os sons atualmente a tocar com um fade de 0.2s
        stopAllSounds(currentAudioContext, globalActivePlayingInstances, soundData, 0.2);

        // Limpar os dados de cada célula e do IndexedDB
        for (let i = 0; i < NUM_CELLS; i++) {
            if (soundData[i]) {
                if (soundData[i].soundFileId) {
                    try {
                        await window.soundboardApp.dbManager.deleteSoundFile(soundData[i].soundFileId);
                        console.log(`Ficheiro de áudio com ID ${soundData[i].soundFileId} excluído do IndexedDB durante o clearAll.`);
                    } catch (error) {
                        console.error(`Erro ao excluir ficheiro do IndexedDB para célula ${i} durante o clearAll:`, error);
                    }
                }
                clearSoundData(i, soundData, currentAudioContext, globalActivePlayingInstances);
                const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                if (cell) {
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
                    cell.classList.remove('active', 'playing-feedback');
                }
            }
        }
        // Também limpa todos os cues
        window.soundboardApp.cueGoSystem.removeAllCues(soundData);
        // Salva as configurações após todas as células serem limpas
        saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        console.log("Todas as células limpas.");
    }

    /**
     * Limpa apenas os dados internos de uma célula (não lida com a UI ou IndexedDB).
     * @param {number} index - O índice da célula.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     */
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
            soundData[index] = null; // Zera a entrada
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
        loadSoundFromIndexedDB: loadSoundFromIndexedDB, // Nome da função alterado
        loadMultipleFilesIntoCells: loadMultipleFilesIntoCells,
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
