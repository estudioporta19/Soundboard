// js/audioManager.js
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
     * Limpa os dados de um som de uma célula, incluindo instâncias de reprodução e cache.
     * Esta é uma função auxiliar interna.
     * @param {number} index - O índice da célula.
     * @param {Array} soundData - O array global de dados de som.
     * @param {AudioContext} currentAudioContext - O contexto de áudio atual.
     * @param {Set<Object>} globalActivePlayingInstances - O conjunto global de instâncias de som ativas.
     */
    function clearSoundData(index, soundData, currentAudioContext, globalActivePlayingInstances) {
        const sound = soundData[index];
        if (!sound) return;

        // Parar todas as instâncias ativas deste som
        if (sound.activePlayingInstances && sound.activePlayingInstances.size > 0) {
            const now = currentAudioContext.currentTime;
            sound.activePlayingInstances.forEach(instance => {
                stopSoundInstance(instance, now, 0.05); // Pequeno fade out ao limpar
                globalActivePlayingInstances.delete(instance); // Remover também do global
            });
            sound.activePlayingInstances.clear();
        }

        // Limpa o cache do AudioBuffer
        sound._audioBufferCache = null;
        // Remove a entrada do soundData
        soundData[index] = null;
    }


    /**
     * Carrega um ficheiro de áudio para uma célula e armazena seu ArrayBuffer no IndexedDB.
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
        const soundId = `sound-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`; // Gerar um UUID mais robusto

        let arrayBuffer = null;
        let audioBuffer = null;

        try {
            // Converter File para ArrayBuffer
            arrayBuffer = await file.arrayBuffer();

            console.log(`[loadFileIntoCell] Tentando decodificar áudio para ${file.name} para o AudioBuffer...`);
            audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer);
            console.log(`[loadFileIntoCell] Sucesso na decodificação de ${file.name}. Duração: ${audioBuffer.duration} segundos.`);

            // Se já havia um som na célula, remova o antigo do IndexedDB
            if (soundData[index] && soundData[index].soundFileId) {
                await window.soundboardApp.dbManager.deleteAudio(soundData[index].soundFileId); // Usar deleteAudio do dbManager
                console.log(`[loadFileIntoCell] Antigo ficheiro com ID ${soundData[index].soundFileId} excluído do IndexedDB.`);
            }

            // Salve o ArrayBuffer no IndexedDB. O dbManager espera ArrayBuffer.
            await window.soundboardApp.dbManager.saveAudio(soundId, arrayBuffer); // <--- CORREÇÃO AQUI: Chamar saveAudio
            console.log(`[loadFileIntoCell] ArrayBuffer de ${file.name} guardado no IndexedDB com ID: ${soundId}`);

            const fixedKey = window.soundboardApp.defaultKeys[index];
            const defaultName = file.name.replace(/\.[^/.]+$/, "");
            const cellColor = window.soundboardApp.utils.getRandomHSLColor();

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
            
            // Garante que o slot está vazio e tenta remover do IndexedDB em caso de falha
            if (soundData[index] && soundData[index].soundFileId) {
                await window.soundboardApp.dbManager.deleteAudio(soundData[index].soundFileId).catch(err => console.error("Erro ao limpar do DB após falha de carregamento:", err));
            } else if (soundId) { // Se o ID já foi gerado mas não associado a soundData[index]
                 await window.soundboardApp.dbManager.deleteAudio(soundId).catch(err => console.error("Erro ao limpar do DB após falha de carregamento (ID temporário):", err));
            }
            
            soundData[index] = null; 
            saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        }
    }

    /**
     * Carrega um som a partir do IndexedDB para uma célula (usado para carregar sessões salvas).
     * Esta função é crucial para o carregamento inicial e de sessões.
     * @param {string} soundId - O ID do som no IndexedDB.
     * @param {HTMLElement} cell - O elemento DOM da célula de som.
     * @param {number} index - O índice da célula.
     * @param {Array} soundData - O array global de dados de som (já contém metadados, mas precisamos do _audioBufferCache).
     * @param {AudioContext} audioContextParam - O contexto de áudio.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Callback para obter traduções.
     */
    async function loadSoundFromIndexedDB(soundId, cell, index, soundData, audioContextParam, updateCellDisplay, getTranslation) {
        initAudioContext(window.soundboardApp.volumeRange);
        const currentAudioContext = audioContextParam || window.soundboardApp.audioContext;

        if (!currentAudioContext) {
            console.error("AudioContext não inicializado ao tentar carregar som do IndexedDB.");
            return;
        }

        // Recupera os metadados já carregados pelo settingsManager
        const soundMetadata = soundData[index];
        if (!soundMetadata || !soundMetadata.soundFileId) {
            console.warn(`[loadSoundFromIndexedDB] soundId ou metadados inválidos para célula ${index}. Limpando célula.`);
            // Apenas atualiza o display se houver um cellElement válido
            if (cell) {
                 updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[index] || '', isLooping: false, isCued: false }, true, getTranslation);
            }
            soundData[index] = null; // Garante que o slot está vazio
            return;
        }

        // Se o buffer já estiver em cache, não precisamos recarregar do DB
        if (soundMetadata._audioBufferCache) {
            console.log(`[loadSoundFromIndexedDB] Áudio para célula ${index} já em cache. Pulando recarregamento do IndexedDB.`);
            return;
        }

        try {
            console.log(`[loadSoundFromIndexedDB] Tentando obter ArrayBuffer com ID: ${soundMetadata.soundFileId} para célula ${index}...`);
            const arrayBuffer = await window.soundboardApp.dbManager.getAudio(soundMetadata.soundFileId); // <--- CORREÇÃO AQUI: Chamar getAudio

            if (!arrayBuffer) {
                console.warn(`[loadSoundFromIndexedDB] ArrayBuffer com ID ${soundMetadata.soundFileId} não encontrado no IndexedDB para célula ${index}. Limpando célula.`);
                // Limpa os dados e o IndexedDB se o arquivo estiver faltando
                if (soundData[index] && soundData[index].soundFileId) {
                    await window.soundboardApp.dbManager.deleteAudio(soundData[index].soundFileId);
                }
                clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
                if (cell) {
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: soundMetadata.key || '', isLooping: false, isCued: false }, true, getTranslation);
                }
                return;
            }

            console.log(`[loadSoundFromIndexedDB] Sucesso ao obter ArrayBuffer do IndexedDB para ${soundMetadata.name || 'N/A'}. Decodificando...`);
            const audioBuffer = await currentAudioContext.decodeAudioData(arrayBuffer);
            console.log(`[loadSoundFromIndexedDB] Sucesso na decodificação de áudio para célula ${index}. Duração: ${audioBuffer.duration}s`);

            // Atualiza o _audioBufferCache do objeto soundData que já existe
            soundMetadata._audioBufferCache = audioBuffer; 
            
            // Garante que o display da célula está correto com o nome e cor do som carregado
            if (cell) {
                updateCellDisplay(cell, soundMetadata, false, getTranslation);
            }
            // Não chame saveSettingsCallback aqui, pois esta função é parte do carregamento inicial/de sessão
            // O settingsManager já fará um saveSettings geral após o loop de carregamento.

        } catch (error) {
            console.error(`[loadSoundFromIndexedDB] ERRO FATAL ao decodificar o áudio do IndexedDB para célula ${index} (${soundMetadata.soundFileId}):`, error);
            alert(getTranslation('alertDecodeError').replace('{soundName}', soundMetadata.name || 'N/A') + `\nDetalhes: ${error.message}`);
            // Limpa em caso de erro na decodificação
            if (soundData[index] && soundData[index].soundFileId) {
                await window.soundboardApp.dbManager.deleteAudio(soundData[index].soundFileId);
            }
            clearSoundData(index, soundData, currentAudioContext, window.soundboardApp.globalActivePlayingInstances);
            if (cell) {
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: soundMetadata.key || '', isLooping: false, isCued: false }, true, getTranslation);
            }
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
        // Verifica se há um objeto de som E se ele tem um cache OU um ID para carregar
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
                const arrayBuffer = await window.soundboardApp.dbManager.getAudio(sound.soundFileId); // <--- CORREÇÃO AQUI: Chamar getAudio
                if (!arrayBuffer) {
                    console.error(`[playSound] ArrayBuffer com ID ${sound.soundFileId} não encontrado no IndexedDB. Limpando célula.`);
                    // Chame clearSoundCell de forma assíncrona, passando os parâmetros necessários
                    await clearSoundCell(index, 0, soundData, currentAudioContext, globalActivePlayingInstances, window.soundboardApp.cellManager.updateCellDisplay, window.soundboardApp.i18n.getTranslation, window.soundboardApp.settingsManager.saveSettings);
                    return false;
                }

                audioBufferToPlay = await currentAudioContext.decodeAudioData(arrayBuffer);
                sound._audioBufferCache = audioBufferToPlay; // Cache o buffer para usos futuros
            } catch (error) {
                console.error(`[playSound] Erro ao recarregar áudio do IndexedDB para ${sound.name}:`, error);
                await clearSoundCell(index, 0, soundData, currentAudioContext, globalActivePlayingInstances, window.soundboardApp.cellManager.updateCellDisplay, window.soundboardApp.i18n.getTranslation, window.soundboardApp.settingsManager.saveSettings);
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
                // Ajustado para usar a duração do AudioBuffer decodificado
                // E também adicionando um pequeno atraso extra para garantir que a classe é removida APÓS o fim real
                setTimeout(() => {
                    if (!sound.isLooping && sound.activePlayingInstances.size === 0) {
                        cell.classList.remove('active', 'playing-feedback');
                    }
                }, (audioBufferToPlay.duration + currentFadeInDuration + currentFadeOutDuration) * 1000 + 50); // Considerar fadeOut tbm
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
                // Evita valores muito pequenos que podem causar clipping, usa um valor pequeno mas positivo.
                instance.gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

                // Agenda a parada da fonte logo após o fade-out completo
                instance.source.stop(now + fadeDuration + 0.05); // +0.05 para garantir que o fade termine

                // Limpa o onended para evitar chamadas duplicadas ou lógica indesejada
                instance.source.onended = null;

                if (instance.cellIndex !== undefined) {
                    const cell = document.querySelector(`.sound-cell[data-index="${instance.cellIndex}"]`);
                    // Garante que a classe é removida APÓS o fade-out e o stop real
                    setTimeout(() => {
                        // Só remove as classes se não houver mais instâncias ativas para aquele som
                        if (cell && instance.soundDataEntry && instance.soundDataEntry.activePlayingInstances.size === 0) {
                            cell.classList.remove('active', 'playing-feedback');
                        }
                    }, (fadeDuration * 1000) + 100); // 100ms de buffer
                }

            } catch (error) {
                console.warn("Erro ao parar instância de som ou aplicar fade-out:", error);
                // Fallback para parar imediatamente se o fade falhar
                if (instance.source && typeof instance.source.stop === 'function') {
                    instance.source.stop();
                    if (instance.cellIndex !== undefined) {
                        const cell = document.querySelector(`.sound-cell[data-index="${instance.cellIndex}"]`);
                        if (cell) {
                            cell.classList.remove('active', 'playing-feedback');
                        }
                    }
                }
            } finally {
                // Desconecta os nós para liberar recursos, garantindo que aconteça
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
                }, (fadeDuration * 1000) + 150); // Um pouco mais de atraso para desconectar
            }
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
                await window.soundboardApp.dbManager.deleteAudio(soundData[index].soundFileId); // <--- CORREÇÃO AQUI: Chamar deleteAudio
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
                        await window.soundboardApp.dbManager.deleteAudio(soundData[i].soundFileId); // <--- CORREÇÃO AQUI: Chamar deleteAudio
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
        // Limpar o IndexedDB completamente (opcional, dependendo da necessidade)
        try {
             await window.soundboardApp.dbManager.clearAllAudio(); // <--- Opcional: Limpa TUDO do DB
             console.log("IndexedDB completamente limpo.");
        } catch (error) {
             console.error("Erro ao limpar todo o IndexedDB:", error);
        }

        saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        console.log("Todas as células de som limpas.");
    }

    return {
        initAudioContext: initAudioContext,
        loadFileIntoCell: loadFileIntoCell,
        loadSoundFromIndexedDB: loadSoundFromIndexedDB,
        loadMultipleFilesIntoCells: loadMultipleFilesIntoCells,
        playSound: playSound,
        fadeoutSound: fadeoutSound, // Adicionado para ser chamado externamente
        clearSoundCell: clearSoundCell,
        clearAllSoundCells: clearAllSoundCells, // Adicionado para ser chamado externamente
        stopAllSounds: stopAllSounds // Adicionado para ser chamado externamente
    };
})();
