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

    async function loadSoundFromDataURL(audioDataUrl, cell, index, name, key, color, isLooping, isCued, soundData, audioContext, updateCellDisplay, getTranslation, saveSettingsCallback) {
        initAudioContext(window.soundboardApp.volumeRange); // Ensure context is initialized
        const arrayBuffer = base64ToArrayBuffer(audioDataUrl.split(',')[1]); // Decode base64 to ArrayBuffer

        try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            if (soundData[index]) {
                // Clear any existing instances for this cell before replacing
                clearSoundData(index, soundData, audioContext, window.soundboardApp.globalActivePlayingInstances);
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
            console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
            alert(getTranslation('alertDecodeError').replace('{soundName}', name || 'N/A'));
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

    async function loadFileIntoCell(file, cell, index, soundData, audioContext, updateCellDisplay, getTranslation, saveSettingsCallback) {
        initAudioContext(window.soundboardApp.volumeRange);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const audioDataUrl = e.target.result;
            const arrayBuffer = e.target.result; // FileReader result is ArrayBuffer when readAsArrayBuffer

            try {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const defaultName = file.name.replace(/\.[^/.]+$/, "");
                const fixedKey = window.soundboardApp.defaultKeys[index];

                const cellColor = window.soundboardApp.utils.getRandomHSLColor();

                if (soundData[index]) {
                    clearSoundData(index, soundData, audioContext, window.soundboardApp.globalActivePlayingInstances);
                }

                soundData[index] = {
                    name: defaultName,
                    key: fixedKey,
                    audioBuffer: audioBuffer,
                    audioDataUrl: audioDataUrl,
                    activePlayingInstances: new Set(),
                    color: cellColor,
                    isLooping: false,
                    isCued: false
                };
                updateCellDisplay(cell, soundData[index], false, getTranslation);
                saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
            } catch (error) {
                console.error(`Erro ao decodificar o áudio para célula ${index}:`, error);
                alert(getTranslation('alertLoadError').replace('{fileName}', file.name));
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: fixedKey || '', isLooping: false, isCued: false }, true, getTranslation);
                soundData[index] = null; // Ensure the slot is marked as empty
                saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function playSound(index, soundData, audioContext, playMultipleCheckbox, autokillModeCheckbox, globalActivePlayingInstances, currentFadeInDuration, currentFadeOutDuration, volumeRange) {
        initAudioContext(volumeRange);

        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) cell.classList.remove('active'); // Ensure visual state is clean
            console.log(`Célula ${index} vazia ou áudio não carregado.`);
            return false; // Indicate that sound was not played
        }

        const now = audioContext.currentTime;

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
            const prevCell = document.querySelector(`.sound-cell[data-index="${lastPlayedSoundIndex}"]`);
            if (prevCell) {
                prevCell.classList.remove('active');
            }
        }

        // If not playing multiple, stop all active instances of THIS sound before playing a new one
        if (!playMultipleCheckbox.checked && sound.activePlayingInstances.size > 0) {
            sound.activePlayingInstances.forEach(instance => {
                stopSoundInstance(instance, now, currentFadeOutDuration);
            });
            sound.activePlayingInstances.clear();
        }

        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;
        source.loop = sound.isLooping;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.001; // Start from near silent for fade-in

        source.connect(gainNode);
        gainNode.connect(masterGainNode); // Connect to the master gain

        const initialVolume = volumeRange.value; // Get current global volume

        if (currentFadeInDuration > 0) {
            gainNode.gain.linearRampToValueAtTime(initialVolume, now + currentFadeInDuration);
        } else {
            gainNode.gain.setValueAtTime(initialVolume, now); // Immediate start
        }

        source.start(now);

        const activeInstance = { source: source, gain: gainNode, startTime: now };
        sound.activePlayingInstances.add(activeInstance);
        globalActivePlayingInstances.add(activeInstance);

        source.onended = () => {
            sound.activePlayingInstances.delete(activeInstance);
            globalActivePlayingInstances.delete(activeInstance);
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            // Only remove 'active' class if no other instances of this sound are playing
            if (cell && sound.activePlayingInstances.size === 0) {
                cell.classList.remove('active');
            }
        };

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('active');
            // Remove active class after sound finishes if not looping
            if (!sound.isLooping) {
                setTimeout(() => {
                    if (!sound.isLooping && sound.activePlayingInstances.size === 0) {
                         cell.classList.remove('active');
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
                instance.gain.gain.cancelScheduledValues(now);
                instance.gain.gain.setValueAtTime(instance.gain.gain.value, now);
                instance.gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration); // Fade to near silence

                // Ensure the source actually stops after the fade.
                // It's important to schedule the stop _after_ the fade finishes.
                instance.source.stop(now + fadeDuration + 0.05); // Stop slightly after fade ends
                instance.source.onended = null; // Clear onended to prevent re-triggering removal
            } catch (error) {
                console.warn("Erro ao parar instância de som ou aplicar fade-out:", error);
                if (instance.source && typeof instance.source.stop === 'function') {
                    instance.source.stop(); // Fallback to immediate stop if fade fails
                }
            }
            // Disconnect immediately to free resources after a short delay to allow fade to start
            setTimeout(() => {
                if (instance.source) {
                    try { instance.source.disconnect(); } catch (e) { console.warn("Error disconnecting source:", e); }
                }
                if (instance.gain) {
                    try { instance.gain.disconnect(); } catch (e) { console.warn("Error disconnecting gain:", e); }
                }
            }, (fadeDuration * 1000) + 100); // Give a bit more time for disconnect
        }
    }


    function fadeoutSound(index, duration, soundData, audioContext, globalActivePlayingInstances) {
        if (!audioContext) return;
        const sound = soundData[index];
        if (!sound || sound.activePlayingInstances.size === 0) return;

        const now = audioContext.currentTime;
        const instancesToFade = new Set(sound.activePlayingInstances); // Clone the set to avoid modification issues

        instancesToFade.forEach(instance => {
            stopSoundInstance(instance, now, duration);
            sound.activePlayingInstances.delete(instance);
            globalActivePlayingInstances.delete(instance);
        });

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.remove('active');
        }
    }

    function stopAllSounds(audioContext, globalActivePlayingInstances, soundData) {
        if (audioContext) {
            const now = audioContext.currentTime;
            const fadeDuration = 0.2; // Quick fade out for stopping all

            const instancesToStop = new Set(globalActivePlayingInstances); // Clone set to iterate safely

            instancesToStop.forEach(instance => {
                stopSoundInstance(instance, now, fadeDuration);
            });

            globalActivePlayingInstances.clear(); // Clear the global set

            document.querySelectorAll('.sound-cell.active').forEach(cell => {
                cell.classList.remove('active');
            });

            // Ensure individual sound active instances are also cleared
            soundData.forEach(sound => {
                if (sound && sound.activePlayingInstances) {
                    sound.activePlayingInstances.clear();
                }
            });
            lastPlayedSoundIndex = null; // Reset last played index
        }
    }

    function clearSoundCell(index, fadeDuration, soundData, audioContext, globalActivePlayingInstances, updateCellDisplay, getTranslation, saveSettingsCallback) {
        if (!soundData[index]) return;

        fadeoutSound(index, fadeDuration, soundData, audioContext, globalActivePlayingInstances);

        // Clear sound data after fade out (or immediately if no fade)
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[index] || '', isLooping: false, isCued: false }, true, getTranslation);
        }

        clearSoundData(index, soundData, audioContext, globalActivePlayingInstances);
        saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
    }

    function clearAllSoundCells(soundData, audioContext, globalActivePlayingInstances, NUM_CELLS, updateCellDisplay, getTranslation, saveSettingsCallback) {
        const fadeDuration = 0.2; // A small fade duration for clearing all

        // Stop all currently playing sounds
        stopAllSounds(audioContext, globalActivePlayingInstances, soundData);

        // Then clear the data for each cell
        for (let i = 0; i < NUM_CELLS; i++) {
            if (soundData[i]) { // Only process if there's actually data
                const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                // Clear the sound data for the cell
                clearSoundData(i, soundData, audioContext, globalActivePlayingInstances);
                // Update the cell's display to empty
                if (cell) {
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
                }
            }
        }
        // Also clear all cues
        window.soundboardApp.cueGoSystem.removeAllCues(soundData);
        // Save settings after all cells are cleared
        saveSettingsCallback(soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
        console.log("Todas as células limpas.");
    }


    function clearSoundData(index, soundData, audioContext, globalActivePlayingInstances) {
        if (soundData[index]) {
            // Ensure any remaining active instances are properly stopped and disconnected
            if (soundData[index].activePlayingInstances.size > 0) {
                const now = audioContext.currentTime;
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
        playSound: playSound,
        fadeoutSound: fadeoutSound,
        stopAllSounds: stopAllSounds,
        clearSoundCell: clearSoundCell,
        clearAllSoundCells: clearAllSoundCells, // New function
        clearSoundData: clearSoundData,
        getLastPlayedSoundIndex: getLastPlayedSoundIndex,
        setLastPlayedSoundIndex: setLastPlayedSoundIndex
    };
})();
