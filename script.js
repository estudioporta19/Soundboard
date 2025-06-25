document.addEventListener('DOMContentLoaded', () => {
    // Declarações de variáveis globais
    let audioContext;
    let soundData = []; // Array para armazenar dados dos sons carregados
    const NUM_CELLS = 29; // Total de células (Q-P, A-L, Z-M)
    const defaultKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm'];
    let globalActivePlayingInstances = new Set(); // Conjunto de todas as instâncias de som ativas
    let lastPlayedSoundIndex = null; // Para a funcionalidade GO (Qlab style)
    let deleteTimer = null; // Para o clique longo no botão de apagar
    let cuedSounds = new Set(); // Conjunto de índices dos sons em cue

    // Elementos do DOM
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const fadeInRange = document.getElementById('fadeIn-range');
    const fadeInDisplay = document.getElementById('fadeIn-display');
    const fadeOutRange = document.getElementById('fadeOut-range');
    const fadeOutDisplay = document.getElementById('fadeOut-display');
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const autokillModeCheckbox = document.getElementById('autokill-mode');
    const stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');
    const langButtons = document.querySelectorAll('.lang-button');
    const stopConfirmationPopup = document.getElementById('stop-confirmation-popup');
    const confirmStopYesBtn = document.getElementById('confirm-stop-yes');
    const confirmStopNoBtn = document.getElementById('confirm-stop-no');
    let translations = {};
    let currentLanguage = localStorage.getItem('language') || 'pt'; // Default to Portuguese

    // Funções de Utilidade

    async function loadTranslations() {
        try {
            const response = await fetch('translations.json');
            translations = await response.json();
            console.log("Translations loaded:", translations);
        } catch (error) {
            console.error("Error loading translations:", error);
            // Fallback to English if translations fail to load
            translations = {
                en: {
                    title: "Soundboard QWERTY",
                    mainTitle: "Soundboard QWERTY",
                    volumeLabel: "Volume:",
                    fadeInLabel: "Fade In:",
                    fadeOutLabel: "Fade Out:",
                    immediateStart: " (Immediate Start)",
                    immediateStop: " (Immediate Stop)",
                    playMultipleLabel: "Play Multiple",
                    autokillLabel: "Auto-Kill Previous",
                    loadMultipleSoundsButton: "Load Multiple Sounds",
                    stopAllSoundsButton: "Stop All Sounds (ESC)",
                    clearAllCellsButton: "Clear All Cells",
                    cellEmptyDefault: "Drag or Click",
                    alertInvalidFile: "Invalid file type. Please drag an audio file (MP3, WAV, OGG).",
                    alertNoEmptyCells: "No more empty cells available to load {fileName}.",
                    alertLoadingError: "Error loading sound",
                    confirmStopAll: "Are you sure you want to stop all sounds?",
                    yesButton: "Yes",
                    noButton: "No",
                    confirmClearAllCells: "Are you sure you want to clear all cells? This will stop all sounds and remove all loaded audio files.",
                    howToUseTitle: "How to Use:",
                    dragDropHelp: "Drag & Drop: Drag audio files (MP3, WAV, OGG) to cells to fill them.",
                    clickHelp: "Click: Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.",
                    shortcutsHelp: "Keyboard Shortcuts: Press the corresponding key on your keyboard to play the sound. (Ex: Q for the first cell).",
                    navigationHelp: "Navigation (QLab style): Press <kbd>Space</kbd> to play the next available sound. Press <kbd>Ctrl</kbd> + <kbd>Space</kbd> to play the previous available sound. Empty cells are skipped.",
                    stopAllHelp: "Stop Sounds: Press <kbd>ESC</kbd> to stop all playing sounds.",
                    volumeHelp: "Adjust Volume: Use the volume slider or the <kbd>⬆️</kbd> and <kbd>⬇️</kbd> keys to control the global volume.",
                    deleteSoundHelp: "Delete Sound: Click the <span style='font-size:1.1em;'>❌</span> in the top right corner of a cell to empty it. *A quick click deletes; a long click (>0.5s) fades out.*",
                    replaceSoundHelp: "Replace Sound: Click the <span class='material-symbols-outlined' style='vertical-align: middle; font-size: 1.1em;'>upload_file</span> to load a new sound into the cell.",
                    renameHelp: "Rename: Click the sound name to edit it.",
                    fadeInHelp: "Control Fade In: Use the Fade In slider, or <kbd>Ctrl</kbd> + numeric keys <kbd>0</kbd>-<kbd>9</kbd> to set the fade in duration in seconds.",
                    fadeOutControlHelp: "Control Fade Out: Use the Fade Out slider, or numeric keys <kbd>0</kbd>-<kbd>9</kbd> to set the fade out duration in seconds.",
                    playMultipleModeHelp: "Play Multiple Mode: Allows multiple sounds to play simultaneously if checked.",
                    autokillModeHelp: "Auto-Kill Previous Mode: When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.",
                    cueHelp: "CUE / GO: Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to 'cue' (mark) a sound. Press <kbd>Enter</kbd> to play all 'cued' sounds with fade-in. Press <kbd>Shift</kbd> + <kbd>Enter</kbd> to stop all 'cued' sounds with fade-out.",
                    cueSingleHelp: "Individual CUE: Press <kbd>Ctrl</kbd> + click on the cell to add/remove a sound from the 'cue'.",
                    removeCueHelp: "Remove CUE: Press <kbd>Alt</kbd> + <kbd>Enter</kbd> to remove all sounds from 'cue' without stopping them.",
                    toggleHelpButton: "Show Help",
                    toggleHelpButtonHide: "Hide Help"
                }
            };
            currentLanguage = 'en'; // Force English if load fails
        }
    }

    function setLanguage(lang) {
        currentLanguage = lang;
        document.documentElement.lang = lang; // Set HTML lang attribute
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.dataset.key;
            if (translations[lang] && translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        // Update specific text contents that are not just data-key
        updateFadeInDisplay();
        updateFadeOutDisplay();
        updateVolumeDisplay(); // Ensure volume display is updated for current language if needed

        // Update help button text based on visibility
        const toggleHelpButton = document.getElementById('toggle-help-button');
        const helpTextContent = document.getElementById('help-text-content');
        if (toggleHelpButton && helpTextContent) {
            if (helpTextContent.classList.contains('active')) { // Check for 'active' which maps to 'visible'
                toggleHelpButton.textContent = translations[currentLanguage].toggleHelpButtonHide || "Esconder Ajuda";
            } else {
                toggleHelpButton.textContent = translations[currentLanguage].toggleHelpButton || "Mostrar Ajuda";
            }
        }

        // Update placeholder for empty cells
        document.querySelectorAll('.sound-cell:not(.filled) .sound-name').forEach(nameElement => {
            if (!nameElement.isContentEditable || nameElement.textContent === "") { // Only update if it's the default text
                nameElement.textContent = translations[currentLanguage].cellEmptyDefault;
            }
        });

        langButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.lang === lang) {
                button.classList.add('active');
            }
        });
        saveSettings(); // Save chosen language
    }

    // Gerenciamento de Armazenamento Local
    function saveSettings() {
        const settingsToSave = {
            volume: volumeRange.value,
            fadeIn: fadeInRange.value,
            fadeOut: fadeOutRange.value,
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            currentLanguage: currentLanguage,
            lastPlayedSoundIndex: lastPlayedSoundIndex,
            soundData: soundData.map(sound => {
                if (sound && sound.audioBuffer) {
                    // Only save path and other metadata, not the AudioBuffer itself
                    return {
                        name: sound.name,
                        path: sound.path || null, // Ensure path is saved if available
                        isLooping: sound.isLooping,
                        volume: sound.volume,
                        isCued: sound.isCued
                    };
                }
                return null;
            })
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
        console.log("Settings saved.");
    }

    async function loadSettings() {
        console.log("Attempting to load settings...");
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings'));
        console.log("Saved Settings:", savedSettings);

        // Initialize global settings
        if (savedSettings) {
            if (savedSettings.volume !== undefined) {
                volumeRange.value = savedSettings.volume;
                if (audioContext && audioContext.masterGainNode) {
                    audioContext.masterGainNode.gain.value = parseFloat(savedSettings.volume);
                }
                updateVolumeDisplay();
            }
            if (savedSettings.fadeIn !== undefined) {
                fadeInRange.value = savedSettings.fadeIn;
                updateFadeInDisplay();
            }
            if (savedSettings.fadeOut !== undefined) {
                fadeOutRange.value = savedSettings.fadeOut;
                updateFadeOutDisplay();
            }
            if (savedSettings.playMultiple !== undefined) {
                playMultipleCheckbox.checked = savedSettings.playMultiple;
            }
            if (savedSettings.autokillMode !== undefined) {
                autokillModeCheckbox.checked = savedSettings.autokillMode;
            }
            if (savedSettings.currentLanguage) {
                setLanguage(savedSettings.currentLanguage);
            }
            if (savedSettings.lastPlayedSoundIndex !== undefined) {
                lastPlayedSoundIndex = savedSettings.lastPlayedSoundIndex;
            }

            // Load sound data
            if (savedSettings.soundData && Array.isArray(savedSettings.soundData)) {
                // Re-initialize soundData array to ensure correct size and nulls
                soundData = Array(NUM_CELLS).fill(null);

                for (let i = 0; i < NUM_CELLS; i++) {
                    const savedSound = savedSettings.soundData[i];
                    const cellElement = document.querySelector(`.sound-cell[data-index="${i}"]`);

                    if (savedSound && savedSound.path) {
                        try {
                            const response = await fetch(savedSound.path);
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            const arrayBuffer = await response.arrayBuffer();
                            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                            soundData[i] = {
                                name: savedSound.name || savedSound.path.split('/').pop().replace(/\.[^/.]+$/, ""),
                                audioBuffer: audioBuffer,
                                key: defaultKeys[i],
                                isLooping: savedSound.isLooping || false,
                                volume: savedSound.volume || 1,
                                activePlayingInstances: new Set(),
                                index: i,
                                isCued: savedSound.isCued || false,
                                path: savedSound.path // Restore path for saving
                            };
                            // Update display for loaded sound
                            updateCellDisplay(cellElement, soundData[i]);
                            if (soundData[i].isCued) { // Re-add to cuedSounds set
                                cuedSounds.add(i);
                            }
                        } catch (error) {
                            console.error(`Error loading sound for cell ${i} from path ${savedSound.path}:`, error);
                            soundData[i] = null; // Mark as null if loading fails
                            // Update display for empty cell if loading failed
                            updateCellDisplay(cellElement, {
                                name: translations[currentLanguage].cellEmptyDefault,
                                key: defaultKeys[i],
                                isLooping: false,
                                isCued: false,
                                audioBuffer: null
                            }, true);
                        }
                    } else {
                        soundData[i] = null; // Ensure cell is marked as empty
                        // Update display for empty cell
                        updateCellDisplay(cellElement, {
                            name: translations[currentLanguage].cellEmptyDefault,
                            key: defaultKeys[i],
                            isLooping: false,
                            isCued: false,
                            audioBuffer: null
                        }, true);
                    }
                }
            }
        } else {
            console.log("No saved settings found. Initializing with defaults.");
            // Ensure all cells are initialized as empty if no settings
            for (let i = 0; i < NUM_CELLS; i++) {
                const cellElement = document.querySelector(`.sound-cell[data-index="${i}"]`);
                soundData[i] = null; // Explicitly set to null
                updateCellDisplay(cellElement, {
                    name: translations[currentLanguage].cellEmptyDefault,
                    key: defaultKeys[i],
                    isLooping: false,
                    isCued: false,
                    audioBuffer: null
                }, true);
            }
        }
    }


    // Gerenciamento de Sons

    // Esta função é CRÍTICA para a atualização visual das células
    function updateCellDisplay(cellElement, soundDataEntry, isClearing = false) {
        // Ensure soundDataEntry is not null when not clearing
        const hasSound = soundDataEntry && soundDataEntry.audioBuffer;
        const soundNameText = hasSound ? soundDataEntry.name : (isClearing ? translations[currentLanguage].cellEmptyDefault : cellElement.querySelector('.sound-name').textContent); // Keep existing name if not clearing and no new sound

        // Update key display
        let keyDisplay = cellElement.querySelector('.key-display');
        if (!keyDisplay) {
            keyDisplay = document.createElement('div');
            keyDisplay.classList.add('key-display');
            cellElement.prepend(keyDisplay); // Add as the first child
        }
        keyDisplay.textContent = soundDataEntry.key || defaultKeys[parseInt(cellElement.dataset.index)];

        // Update sound name display
        let soundNameElement = cellElement.querySelector('.sound-name');
        if (!soundNameElement) {
            soundNameElement = document.createElement('div');
            soundNameElement.classList.add('sound-name');
            soundNameElement.setAttribute('contenteditable', 'true');
            soundNameElement.setAttribute('spellcheck', 'false');
            cellElement.appendChild(soundNameElement);
        }
        soundNameElement.textContent = soundNameText;
        soundNameElement.contentEditable = hasSound ? 'true' : 'false'; // Only editable if there's a sound

        // Update delete button visibility
        let deleteButton = cellElement.querySelector('.delete-button');
        if (!deleteButton) {
            deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-button');
            deleteButton.innerHTML = '&#x2715;'; // X mark
            cellElement.appendChild(deleteButton);
            deleteButton.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent cell click/play
                startDeleteTimer(cellElement, soundDataEntry.index); // Pass index
            });
            deleteButton.addEventListener('mouseup', (e) => {
                e.stopPropagation();
                cancelDeleteTimer();
            });
            deleteButton.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                cancelDeleteTimer();
            });
        }
        deleteButton.style.display = hasSound ? 'flex' : 'none';

        // Update loop button visibility and state
        let loopButton = cellElement.querySelector('.loop-button');
        if (!loopButton) {
            loopButton = document.createElement('button');
            loopButton.classList.add('loop-button');
            loopButton.innerHTML = '<span class="material-symbols-outlined">loop</span>';
            cellElement.appendChild(loopButton);
            loopButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (soundDataEntry && soundDataEntry.index !== undefined) {
                    toggleLoop(soundDataEntry.index);
                }
            });
        }
        loopButton.style.display = hasSound ? 'flex' : 'none';
        if (hasSound && soundDataEntry.isLooping) {
            loopButton.classList.add('active');
        } else {
            loopButton.classList.remove('active');
        }

        // Update replace sound button visibility
        let replaceSoundButton = cellElement.querySelector('.replace-sound-button');
        if (!replaceSoundButton) {
            replaceSoundButton = document.createElement('button');
            replaceSoundButton.classList.add('replace-sound-button');
            replaceSoundButton.innerHTML = '<span class="material-symbols-outlined">upload_file</span>';
            cellElement.appendChild(replaceSoundButton);
            replaceSoundButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (soundDataEntry && soundDataEntry.index !== undefined) {
                    replaceSoundInCell(cellElement, soundDataEntry.index);
                }
            });
        }
        replaceSoundButton.style.display = hasSound ? 'flex' : 'none';

        // Update 'cued' class
        if (soundDataEntry && soundDataEntry.isCued) {
            cellElement.classList.add('cued');
        } else {
            cellElement.classList.remove('cued');
        }

        // THIS IS THE CRUCIAL PART FOR THE FILLED COLOR
        if (hasSound) {
            cellElement.classList.add('filled');
            cellElement.classList.remove('empty'); // Ensure 'empty' is removed if you had one
        } else {
            cellElement.classList.remove('filled');
            cellElement.classList.add('empty'); // Add an 'empty' class if you want specific styling for empty cells
        }
    }


    function createSoundboard() {
        const keyboardRows = {
            'row-top': ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            'row-home': ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            'row-bottom': ['z', 'x', 'c', 'v', 'b', 'n', 'm']
        };

        let cellIndex = 0;
        for (const rowId in keyboardRows) {
            const rowElement = document.getElementById(rowId);
            if (rowElement) {
                keyboardRows[rowId].forEach(key => {
                    const cell = document.createElement('div');
                    cell.classList.add('sound-cell');
                    cell.dataset.index = cellIndex;

                    // Add data attributes for original key and sound path
                    cell.dataset.key = key; // Store the key directly on the cell

                    // Add event listeners for drag and drop
                    cell.addEventListener('dragover', (e) => {
                        e.preventDefault(); // Allow drop
                        cell.classList.add('drag-over');
                    });
                    cell.addEventListener('dragleave', () => {
                        cell.classList.remove('drag-over');
                    });
                    cell.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        cell.classList.remove('drag-over');
                        const files = e.dataTransfer.files;
                        if (files.length > 0 && files[0].type.startsWith('audio/')) {
                            await loadFileIntoCell(files[0], cell, cellIndex);
                        } else {
                            alert(translations[currentLanguage].alertInvalidFile);
                        }
                    });

                    // Add click listener to cell (for playing or loading)
                    cell.addEventListener('click', async (e) => {
                        // Check if a control button (delete, loop, replace) was clicked
                        if (e.target.closest('.delete-button') || e.target.closest('.loop-button') || e.target.closest('.replace-sound-button') || e.target.closest('.sound-name[contenteditable="true"]')) {
                            return; // Do nothing if a control button or editable name was clicked
                        }

                        // Handle Ctrl + Click for CUE
                        if (e.ctrlKey) {
                            toggleCue(cellIndex);
                            return; // Prevent playing if Ctrl is pressed
                        }

                        if (soundData[cellIndex] && soundData[cellIndex].audioBuffer) {
                            playSound(cellIndex);
                        } else {
                            // If cell is empty, trigger file input
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'audio/mp3, audio/wav, audio/ogg';
                            input.onchange = async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    await loadFileIntoCell(file, cell, cellIndex);
                                }
                            };
                            input.click();
                        }
                    });

                    // Event listener for renaming sound (when contenteditable is true)
                    cell.addEventListener('blur', (e) => {
                        const target = e.target;
                        if (target.classList.contains('sound-name') && target.isContentEditable) {
                            const newName = target.textContent.trim();
                            const index = parseInt(cell.dataset.index);
                            if (soundData[index]) {
                                soundData[index].name = newName;
                                saveSettings(); // Save after renaming
                                console.log(`Sound ${index} renamed to: ${newName}`);
                            }
                        }
                    }, true); // Use capture phase for blur event

                    rowElement.appendChild(cell);

                    // Initialize the cell display (important for filled/empty state)
                    // When created, it's initially empty, so pass a default soundDataEntry for display
                    // The actual soundData will be loaded by loadSettings() later
                    updateCellDisplay(cell, {
                        name: translations[currentLanguage] ? translations[currentLanguage].cellEmptyDefault : 'Drag or Click',
                        key: key,
                        isLooping: false,
                        isCued: false,
                        audioBuffer: null // Explicitly mark as no sound
                    }, true); // Pass true to indicate clearing/initial empty state

                    cellIndex++;
                });
            }
        }
    }

    async function loadFileIntoCell(file, cellElement, index) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.masterGainNode = audioContext.createGain();
            audioContext.masterGainNode.connect(audioContext.destination);
            audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const audioBuffer = await audioContext.decodeAudioData(e.target.result);

                // Stop any currently playing instances in this cell before replacing
                if (soundData[index] && soundData[index].activePlayingInstances) {
                    soundData[index].activePlayingInstances.forEach(instance => {
                        if (instance && instance.source && typeof instance.source.stop === 'function') {
                            instance.source.stop();
                            instance.source.disconnect();
                        }
                        if (instance.gain) {
                            instance.gain.disconnect();
                        }
                    });
                    soundData[index].activePlayingInstances.clear();
                }

                const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

                // Create a local URL for the file to save its path
                const fileUrl = URL.createObjectURL(file);

                soundData[index] = {
                    name: fileName,
                    audioBuffer: audioBuffer,
                    key: defaultKeys[index],
                    isLooping: false,
                    volume: 1, // Default volume for individual sound
                    activePlayingInstances: new Set(),
                    index: index, // Store the index for easy reference
                    isCued: false, // Initialize isCued for new sounds
                    path: fileUrl // Store the URL (will be revoked on unload/clear)
                };

                // Update the cell's display after loading the sound
                updateCellDisplay(cellElement, soundData[index]); // Pass the actual soundData

                saveSettings();
                console.log(`Loaded ${fileName} into cell ${index}`);
            } catch (error) {
                console.error("Error decoding audio data:", error);
                alert(`${translations[currentLanguage].alertLoadingError}: ${file.name}`);
                // If loading fails, ensure the cell is visually reset to empty
                clearSoundData(index); // This will call updateCellDisplay to reset
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function playSound(index, fadeDuration = null) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            console.log(`No sound loaded for cell ${index}`);
            return;
        }

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.masterGainNode = audioContext.createGain();
            audioContext.masterGainNode.connect(audioContext.destination);
            audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
        }

        const now = audioContext.currentTime;
        const currentFadeIn = fadeDuration !== null ? fadeDuration : parseFloat(fadeInRange.value);
        const currentFadeOut = parseFloat(fadeOutRange.value);

        // Auto-kill previous sound if enabled
        if (autokillModeCheckbox.checked && lastPlayedSoundIndex !== null && lastPlayedSoundIndex !== index) {
            stopSound(lastPlayedSoundIndex, 0.1); // Quick fade out for previous sound
        }

        // Stop current sound if "Play Multiple" is not checked
        if (!playMultipleCheckbox.checked) {
            // Stop all instances of THIS sound
            sound.activePlayingInstances.forEach(instance => {
                if (instance && instance.source) {
                    try {
                        instance.source.stop();
                        instance.source.disconnect();
                    } catch (e) {
                        console.warn("Error stopping existing source:", e);
                    }
                }
                if (instance.gain) {
                    try {
                        instance.gain.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting existing gain:", e);
                    }
                }
            });
            // Also remove from global tracking and clear local set
            sound.activePlayingInstances.forEach(instance => globalActivePlayingInstances.delete(instance));
            sound.activePlayingInstances.clear();

            // Remove 'active' class from all other cells if only one sound can play
            if (!playMultipleCheckbox.checked) {
                document.querySelectorAll('.sound-cell.active').forEach(cell => {
                    if (parseInt(cell.dataset.index) !== index) {
                        cell.classList.remove('active');
                    }
                });
            }
        }

        const source = audioContext.createBufferSource();
        source.buffer = sound.audioBuffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.001; // Start at near zero for fade-in
        gainNode.connect(audioContext.masterGainNode); // Connect to master gain

        source.connect(gainNode);

        // Apply fade-in
        gainNode.gain.linearRampToValueAtTime(sound.volume, now + currentFadeIn);

        source.loop = sound.isLooping;

        const currentInstance = {
            source: source,
            gain: gainNode,
            cellIndex: index, // Store the index of the cell
            stopTime: null // Will be set if not looping
        };

        // Add to tracking sets
        sound.activePlayingInstances.add(currentInstance);
        globalActivePlayingInstances.add(currentInstance);

        source.start(0);

        // Set 'active' class for visual feedback
        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cell) {
            cell.classList.add('active');
        }

        // If not looping, schedule stop and cleanup
        if (!sound.isLooping) {
            const duration = sound.audioBuffer.duration;
            currentInstance.stopTime = now + duration;

            source.onended = () => {
                if (source) {
                    try {
                        source.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting source on ended:", e);
                    }
                }
                if (gainNode) {
                    try {
                        gainNode.disconnect();
                    } catch (e) {
                        console.warn("Error disconnecting gainNode on ended:", e);
                    }
                }
                sound.activePlayingInstances.delete(currentInstance);
                globalActivePlayingInstances.delete(currentInstance);

                // Check if any other instances of this sound are still playing
                if (sound.activePlayingInstances.size === 0 && cell) {
                    cell.classList.remove('active');
                }
            };

            // If fade-out is enabled, schedule it before the sound ends
            if (currentFadeOut > 0 && duration > currentFadeOut) {
                gainNode.gain.linearRampToValueAtTime(0.001, now + duration);
            }
        }

        lastPlayedSoundIndex = index; // Update last played sound
        saveSettings(); // Save last played index
    }

    function stopSound(index, fadeDuration = parseFloat(fadeOutRange.value)) {
        const sound = soundData[index];
        if (!sound || !sound.activePlayingInstances.size) {
            return;
        }

        const now = audioContext.currentTime;

        // Create a copy of the Set to iterate, as it will be modified during iteration
        const instancesToStop = new Set(sound.activePlayingInstances);

        instancesToStop.forEach(instance => {
            if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
                try {
                    instance.gain.gain.cancelScheduledValues(now); // Clear any pending automations
                    instance.gain.gain.setValueAtTime(instance.gain.gain.value, now); // Set current value as start for ramp
                    instance.gain.gain.linearRampToValueAtTime(0.001, now + fadeDuration);

                    setTimeout(() => {
                        if (instance.source) {
                            instance.source.stop();
                            instance.source.disconnect();
                        }
                        if (instance.gain) {
                            instance.gain.disconnect();
                        }
                        sound.activePlayingInstances.delete(instance);
                        globalActivePlayingInstances.delete(instance);
                        // Check if no more instances of this specific sound are playing
                        if (sound.activePlayingInstances.size === 0) {
                            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                            if (cell) {
                                cell.classList.remove('active');
                            }
                        }
                    }, fadeDuration * 1000 + 50); // Add a small buffer
                } catch (error) {
                    console.warn(`Erro ao aplicar fade-out ou parar instância para célula ${index}:`, error);
                    // Fallback to immediate stop if fade fails
                    if (instance.source && typeof instance.source.stop === 'function') {
                        instance.source.stop();
                    }
                    if (instance.gain) {
                        instance.gain.disconnect();
                    }
                    sound.activePlayingInstances.delete(instance);
                    globalActivePlayingInstances.delete(instance);
                    if (sound.activePlayingInstances.size === 0) {
                        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                        if (cell) {
                            cell.classList.remove('active');
                        }
                    }
                }
            }
        });
    }

    function clearSoundData(index) {
        if (soundData[index]) {
            // Stop any active playing instances for this specific sound
            if (soundData[index].activePlayingInstances) {
                soundData[index].activePlayingInstances.forEach(instance => {
                    if (instance && instance.source && typeof instance.source.stop === 'function') {
                        instance.source.stop();
                        instance.source.disconnect();
                    }
                    if (instance.gain) {
                        instance.gain.disconnect();
                    }
                });
                soundData[index].activePlayingInstances.clear();
            }

            // Revoke object URL if it exists
            if (soundData[index].path) {
                URL.revokeObjectURL(soundData[index].path);
                console.log(`Revoked Object URL for cell ${index}: ${soundData[index].path}`);
            }

            // Remove from global active instances if present
            globalActivePlayingInstances.forEach(instance => {
                if (instance.cellIndex === index) { // Assuming instance stores cellIndex
                    globalActivePlayingInstances.delete(instance);
                }
            });

            // Remove from cued sounds if present
            cuedSounds.delete(index);

            soundData[index] = null; // Clear the data
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                // Update the cell display to its empty state
                updateCellDisplay(cell, {
                    name: translations[currentLanguage].cellEmptyDefault,
                    key: defaultKeys[index],
                    isLooping: false,
                    isCued: false,
                    audioBuffer: null // Indicate no sound
                }, true); // Pass true to indicate clearing
                cell.classList.remove('active'); // Ensure active class is removed
                cell.classList.remove('cued'); // Ensure cued class is removed
            }
            saveSettings();
            console.log(`Cell ${index} cleared.`);
        }
    }

    function replaceSoundInCell(cellElement, index) {
        // Stop any current sound in the cell before replacing
        if (soundData[index] && soundData[index].activePlayingInstances) {
            soundData[index].activePlayingInstances.forEach(instance => {
                if (instance && instance.source && typeof instance.source.stop === 'function') {
                    instance.source.stop();
                    instance.source.disconnect();
                }
                if (instance.gain) {
                    instance.gain.disconnect();
                }
            });
            soundData[index].activePlayingInstances.clear();
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/mp3, audio/wav, audio/ogg';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await loadFileIntoCell(file, cellElement, index); // Use loadFileIntoCell
            }
        };
        input.click();
    }

    function toggleLoop(index) {
        if (soundData[index]) {
            soundData[index].isLooping = !soundData[index].isLooping;
            const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
            if (cell) {
                // Re-apply display update to toggle the active class on the loop button
                updateCellDisplay(cell, soundData[index]);
                // If it was playing and loop is turned off, it should stop after its natural duration
                if (!soundData[index].isLooping && soundData[index].activePlayingInstances.size > 0) {
                    soundData[index].activePlayingInstances.forEach(instance => {
                        if (instance.source) {
                            instance.source.loop = false; // Turn off looping for active instances
                            // If it's already past its intended natural end, stop it
                            if (audioContext.currentTime > (instance.stopTime || 0)) {
                                stopSound(index); // Stop with fade out
                            }
                        }
                    });
                }
            }
            saveSettings();
        }
    }

    let longPressTimeout;
    let isLongPress = false;

    function startDeleteTimer(cellElement, index) {
        isLongPress = false;
        longPressTimeout = setTimeout(() => {
            isLongPress = true;
            stopSound(index); // Long press stops with fade out
            console.log(`Long press on delete for cell ${index}`);
        }, 500); // 500ms for a long press
    }

    function cancelDeleteTimer() {
        clearTimeout(longPressTimeout);
        if (!isLongPress) {
            // This is a quick click
            const index = parseInt(event.target.closest('.sound-cell').dataset.index);
            clearSoundData(index);
            console.log(`Quick click on delete for cell ${index}`);
        }
    }

    // Cue/Go Functionality
    function toggleCue(index) {
        const sound = soundData[index];
        if (!sound || !sound.audioBuffer) {
            console.log(`Cannot cue empty cell ${index}`);
            return;
        }

        const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
        if (cuedSounds.has(index)) {
            cuedSounds.delete(index);
            sound.isCued = false;
            if (cell) cell.classList.remove('cued');
            console.log(`Cell ${index} removed from cue.`);
        } else {
            cuedSounds.add(index);
            sound.isCued = true;
            if (cell) cell.classList.add('cued');
            console.log(`Cell ${index} added to cue.`);
        }
        saveSettings();
    }

    function playCuedSounds() {
        if (cuedSounds.size === 0) {
            console.log("No sounds are cued.");
            return;
        }

        const cuedIndices = Array.from(cuedSounds).sort((a, b) => a - b); // Play in order
        console.log("Playing cued sounds:", cuedIndices);

        // Optional: clear cues after playing
        // removeAllCues(); // Uncomment if you want cues to be automatically removed after playing

        cuedIndices.forEach(index => {
            if (soundData[index] && soundData[index].audioBuffer) {
                playSound(index, parseFloat(fadeInRange.value)); // Use current fade-in setting
            }
        });
        // Remove 'cued' class visually after playing them all
        document.querySelectorAll('.sound-cell.cued').forEach(cell => {
            cell.classList.remove('cued');
        });
        cuedSounds.clear();
        saveSettings();
    }

    function stopCuedSounds() {
        if (cuedSounds.size === 0) {
            console.log("No sounds are cued to stop.");
            return;
        }
        console.log("Stopping cued sounds:", Array.from(cuedSounds));

        const cuedIndices = Array.from(cuedSounds);
        cuedIndices.forEach(index => {
            stopSound(index, parseFloat(fadeOutRange.value)); // Use current fade-out setting
        });

        removeAllCues(); // Clear cues after stopping
    }

    function removeAllCues() {
        document.querySelectorAll('.sound-cell.cued').forEach(cell => {
            const index = parseInt(cell.dataset.index);
            if (soundData[index]) {
                soundData[index].isCued = false;
            }
            cell.classList.remove('cued');
        });
        cuedSounds.clear();
        saveSettings();
        console.log("All cues removed.");
    }

    // Navegação QLab style (Space / Ctrl+Space)
    function findNextSoundIndex(currentIndex, direction) {
        let attempts = 0;
        let startIndex = currentIndex;

        if (startIndex === -1) { // Special case for first GO (start from 0)
            startIndex = 0;
        } else if (startIndex === NUM_CELLS) { // Special case for first GO- (start from NUM_CELLS - 1)
            startIndex = NUM_CELLS - 1;
        }

        let currentSearchIndex = startIndex;

        while (attempts < NUM_CELLS) {
            currentSearchIndex += direction;

            // Wrap around logic
            if (currentSearchIndex >= NUM_CELLS) {
                currentSearchIndex = 0;
            } else if (currentSearchIndex < 0) {
                currentSearchIndex = NUM_CELLS - 1;
            }

            if (soundData[currentSearchIndex] && soundData[currentSearchIndex].audioBuffer) {
                return currentSearchIndex; // Found next valid sound
            }

            attempts++;

            // Se voltamos ao ponto de partida e já fizemos pelo menos uma tentativa,
            // significa que não há mais sons disponíveis.
            if (currentSearchIndex === startIndex && attempts > 1) {
                return null;
            }
        }
        return null; // Não encontrou nenhum som após várias tentativas
    }

    // Funções de Controlo Global

    function stopAllSounds() {
        // Mostra o pop-up de confirmação
        if (stopConfirmationPopup) {
            stopConfirmationPopup.style.display = 'flex'; // ou 'block', dependendo do seu CSS
            stopConfirmationPopup.classList.add('visible'); // Adiciona a classe visible para animação
        }
    }

    // Event listeners para o pop-up de confirmação
    if (confirmStopYesBtn) {
        confirmStopYesBtn.addEventListener('click', () => {
            if (audioContext) {
                const now = audioContext.currentTime;
                const fadeDuration = 0.2; // Fade out rápido para stop geral

                // Cria uma cópia do Set para iterar, pois pode ser modificado
                const instancesToStop = new Set(globalActivePlayingInstances);

                instancesToStop.forEach(instance => {
                    if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
                        try {
                            instance.gain.gain.cancelScheduledValues(now);
                            instance.gain.gain.setValueAtTime(instance.gain.gain.value, now);
                            instance.gain.gain.linearRampToValueAtTime(0.001, now + fadeDuration);

                            setTimeout(() => {
                                if (instance.source) {
                                    instance.source.stop();
                                    instance.source.disconnect();
                                }
                                if (instance.gain) {
                                    instance.gain.disconnect();
                                }
                            }, fadeDuration * 1000 + 50);
                        } catch (error) {
                            console.warn("Erro ao parar som ou aplicar fade-out:", error);
                            if (instance.source && typeof instance.source.stop === 'function') {
                                instance.source.stop();
                            }
                        }
                    }
                    globalActivePlayingInstances.delete(instance);
                });

                globalActivePlayingInstances.clear();

                document.querySelectorAll('.sound-cell.active').forEach(cell => {
                    cell.classList.remove('active');
                });

                soundData.forEach(sound => {
                    if (sound && sound.activePlayingInstances) {
                        sound.activePlayingInstances.clear();
                    }
                });
                lastPlayedSoundIndex = null;
            }
            if (stopConfirmationPopup) {
                stopConfirmationPopup.style.display = 'none'; // Esconde o pop-up
                stopConfirmationPopup.classList.remove('visible'); // Remove a classe visible
            }
        });
    }

    if (confirmStopNoBtn) {
        confirmStopNoBtn.addEventListener('click', () => {
            if (stopConfirmationPopup) {
                stopConfirmationPopup.style.display = 'none'; // Esconde o pop-up
                stopConfirmationPopup.classList.remove('visible'); // Remove a classe visible
            }
        });
    }


    // NOVO CÓDIGO (Integração Limpar Todas as Células)

    /**
     * Limpa todas as células do soundboard, parando quaisquer sons ativos,
     * redefinindo os dados e o display das células, e removendo cues.
     */
    function clearAllSoundCells() {
        // Exibe um pop-up de confirmação para o utilizador
        if (!confirm(translations[currentLanguage].confirmClearAllCells)) {
            return; // Se o utilizador cancelar, a função termina aqui
        }

        // Primeiro, para todos os sons que possam estar a ser reproduzidos
        // Não mostra o pop-up de stop individualmente aqui
        if (audioContext) {
            const now = audioContext.currentTime;
            const fadeDuration = 0.2; // Fade out rápido ao limpar tudo

            const instancesToStop = new Set(globalActivePlayingInstances);
            instancesToStop.forEach(instance => {
                if (instance && instance.source && instance.gain && typeof instance.gain.gain === 'object') {
                    try {
                        instance.gain.gain.cancelScheduledValues(now);
                        instance.gain.gain.setValueAtTime(instance.gain.gain.value, now);
                        instance.gain.gain.linearRampToValueAtTime(0.001, now + fadeDuration);

                        setTimeout(() => {
                            if (instance.source) {
                                instance.source.stop();
                                instance.source.disconnect();
                            }
                            if (instance.gain) {
                                instance.gain.disconnect();
                            }
                        }, fadeDuration * 1000 + 50);
                    } catch (error) {
                        console.warn("Erro ao parar som ou aplicar fade-out durante clearAll:", error);
                        if (instance.source && typeof instance.source.stop === 'function') {
                            instance.source.stop();
                        }
                    }
                }
                globalActivePlayingInstances.delete(instance);
            });
            globalActivePlayingInstances.clear();
        }

        // Itera sobre todas as células e limpa os seus dados e display
        for (let i = 0; i < NUM_CELLS; i++) {
            clearSoundData(i); // Chama a função existente para limpar os dados de um som específico
            // clearSoundData already calls updateCellDisplay and removes active/cued classes
        }
        cuedSounds.clear(); // Limpa a lista de sons em cue
        lastPlayedSoundIndex = null; // Reseta o cursor do último som reproduzido
        saveSettings(); // Salva o estado atual (vazio) no localStorage
        console.log("Todas as células foram limpas e as configurações salvas.");
    }

    // Obtém a referência para o novo botão "Limpar Todas as Células"
    const clearAllCellsButton = document.getElementById('clear-all-cells'); // ID atualizado para 'clear-all-cells'
    if (clearAllCellsButton) {
        // Adiciona um event listener para o clique do botão
        clearAllCellsButton.addEventListener('click', clearAllSoundCells);
    } else {
        // Alerta no console se o botão não for encontrado (útil para depuração)
        console.warn("Elemento com ID 'clear-all-cells' não encontrado. O botão 'Limpar Todas as Células' não funcionará.");
    }


    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            return;
        }

        // Lógica para Space e Ctrl + Space (Qlab style)
        if (pressedKey === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) { // Apenas Space (GO)
            e.preventDefault();
            let targetIndex;

            if (lastPlayedSoundIndex === null) {
                targetIndex = findNextSoundIndex(-1, 1);
            } else {
                targetIndex = findNextSoundIndex(lastPlayedSoundIndex, 1);
            }

            if (targetIndex !== null) {
                playSound(targetIndex);
            } else {
                console.log("Não há mais sons para tocar para a frente.");
            }
            return;
        } else if (pressedKey === ' ' && e.ctrlKey) { // Ctrl + Space (GO-)
            e.preventDefault();
            let targetIndex;

            if (lastPlayedSoundIndex === null) {
                targetIndex = findNextSoundIndex(NUM_CELLS, -1);
            } else {
                targetIndex = findNextSoundIndex(lastPlayedSoundIndex, -1);
            }

            if (targetIndex !== null) {
                playSound(targetIndex);
            } else {
                console.log("Não há mais sons para tocar para trás.");
            }
            return;
        }

        // Atalhos de teclado para Cue/Go
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.ctrlKey) { // Ctrl + Enter: Adiciona/remove o último som tocado do cue
                if (lastPlayedSoundIndex !== null && soundData[lastPlayedSoundIndex]) {
                    toggleCue(lastPlayedSoundIndex);
                }
            } else if (e.shiftKey) { // Shift + Enter: Para todos os sons em cue
                stopCuedSounds();
            } else if (e.altKey) { // Alt + Enter: Remove todos os cues sem parar
                removeAllCues();
            } else { // Enter (sem modificadores): Toca todos os sons em cue
                playCuedSounds();
            }
            return;
        }

        if (pressedKey === 'arrowup') {
            e.preventDefault();
            volumeRange.value = Math.min(1, parseFloat(volumeRange.value) + 0.05);
            updateVolumeDisplay();
            if (audioContext && audioContext.masterGainNode) {
                audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
            }
            saveSettings();
        } else if (pressedKey === 'arrowdown') {
            e.preventDefault();
            volumeRange.value = Math.max(0, parseFloat(volumeRange.value) - 0.05);
            updateVolumeDisplay();
            if (audioContext && audioContext.masterGainNode) {
                audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
            }
            saveSettings();
        } else if (pressedKey === 'escape') {
            stopAllSounds(); // Chamar a função que exibe o pop-up
        } else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') {
            e.preventDefault();
            fadeInRange.value = parseInt(pressedKey);
            updateFadeInDisplay();
            saveSettings();
        } else if (pressedKey >= '0' && pressedKey <= '9' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            fadeOutRange.value = parseInt(pressedKey);
            updateFadeOutDisplay();
            saveSettings();
        } else {
            const indexToPlay = defaultKeys.indexOf(pressedKey);
            if (indexToPlay !== -1 && soundData[indexToPlay] && soundData[indexToPlay].audioBuffer) {
                playSound(indexToPlay);
            }
        }
    });

    fadeInRange.addEventListener('input', () => {
        updateFadeInDisplay();
        saveSettings();
    });

    fadeOutRange.addEventListener('input', () => {
        updateFadeOutDisplay();
        saveSettings();
    });

    volumeRange.addEventListener('input', () => {
        updateVolumeDisplay();
        if (audioContext && audioContext.masterGainNode) {
            audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
        }
        saveSettings();
    });

    function updateVolumeDisplay() {
        volumeDisplay.textContent = `${Math.round(volumeRange.value * 100)}%`;
    }

    function updateFadeInDisplay() {
        const currentFadeInDuration = parseFloat(fadeInRange.value);
        if (!translations[currentLanguage]) {
            fadeInDisplay.textContent = `Loading...`;
            return;
        }
        if (currentFadeInDuration === 0) {
            fadeInDisplay.textContent = `${currentFadeInDuration}s${translations[currentLanguage].immediateStart || ' (Início Imediato)'}`;
        } else {
            fadeInDisplay.textContent = `${currentFadeInDuration}s`;
        }
    }

    function updateFadeOutDisplay() {
        const currentFadeOutDuration = parseFloat(fadeOutRange.value);
        if (!translations[currentLanguage]) {
            fadeOutDisplay.textContent = `Loading...`;
            return;
        }
        if (currentFadeOutDuration === 0) {
            fadeOutDisplay.textContent = `${currentFadeOutDuration}s${translations[currentLanguage].immediateStop || ' (Paragem Imediata)'}`;
        } else {
            fadeOutDisplay.textContent = `${currentFadeOutDuration}s`;
        }
    }

    playMultipleCheckbox.addEventListener('change', () => {
        saveSettings();
    });

    autokillModeCheckbox.addEventListener('change', () => {
        saveSettings();
    });

    // Event listener para o botão "Parar Todos os Sons" (que agora mostra o pop-up)
    stopAllSoundsBtn.addEventListener('click', stopAllSounds);

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
                    if (soundData[i] === null || (soundData[i] && soundData[i].audioBuffer === null)) {
                        const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                        await loadFileIntoCell(file, cell, i);
                        startIndex = i + 1;
                        foundEmptyCell = true;
                        break;
                    }
                }
                if (!foundEmptyCell) {
                    alert(translations[currentLanguage].alertNoEmptyCells.replace('{fileName}', file.name));
                    break;
                }
            }
        };
        input.click();
    });

    langButtons.forEach(button => {
        button.addEventListener('click', () => {
            setLanguage(button.dataset.lang);
        });
    });

    // Início da ajuda (toggleMenu.js) - adaptado para usar traduções
    const toggleHelpButton = document.getElementById('toggle-help-button');
    const helpTextContent = document.getElementById('help-text-content');

    if (toggleHelpButton && helpTextContent) {
        toggleHelpButton.addEventListener('click', () => {
            helpTextContent.classList.toggle('visible'); // Use 'visible' as per CSS
            if (helpTextContent.classList.contains('visible')) {
                toggleHelpButton.textContent = translations[currentLanguage].toggleHelpButtonHide || "Esconder Ajuda";
            } else {
                toggleHelpButton.textContent = translations[currentLanguage].toggleHelpButton || "Mostrar Ajuda";
            }
        });
    }
    // Fim da ajuda


    // Inicialização da aplicação
    // Garante que o AudioContext é criado antes de tentar carregar sons
    // E que as células são criadas antes de tentar preenchê-las com loadSettings
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.masterGainNode = audioContext.createGain();
        audioContext.masterGainNode.connect(audioContext.destination);
        audioContext.masterGainNode.gain.value = parseFloat(volumeRange.value);
    }
    createSoundboard(); // Create the DOM elements for the soundboard cells

    loadTranslations().then(() => {
        loadSettings();
        setLanguage(currentLanguage); // Garante que a linguagem correta é aplicada após carregar as settings
    });

    // Resumir AudioContext no primeiro clique do utilizador
    document.body.addEventListener('click', () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true }); // Executa apenas uma vez
});
