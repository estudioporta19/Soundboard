// cellManager.js
// Gerencia a criação e atualização das células do soundboard, e seus eventos.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.cellManager = (function() {

    function createSoundCell(index, fixedKey, soundData, playSoundCallback, loadFileIntoCellCallback, clearSoundCellCallback, fadeoutSoundCallback, toggleCueCallback, getTranslationCallback) {
        const cell = document.createElement('div');
        cell.classList.add('sound-cell', 'empty');
        cell.dataset.index = index;

        const replaceButton = document.createElement('button');
        replaceButton.classList.add('replace-sound-button');
        replaceButton.innerHTML = '<span class="material-symbols-outlined">upload_file</span>';
        replaceButton.title = getTranslationCallback('replaceSoundHelp').replace(/<[^>]*>/g, '');
        cell.appendChild(replaceButton);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = '❌';
        deleteButton.title = getTranslationCallback('deleteSoundHelp').replace(/<[^>]*>/g, '');
        cell.appendChild(deleteButton);

        const loopButton = document.createElement('button');
        loopButton.classList.add('loop-button');
        loopButton.innerHTML = '<span class="material-symbols-outlined">loop</span>';
        loopButton.title = getTranslationCallback('loopButtonTitle') || 'Loop (Toggle)';
        cell.appendChild(loopButton);

        const nameDisplay = document.createElement('div');
        nameDisplay.classList.add('sound-name');
        nameDisplay.contentEditable = true;
        nameDisplay.spellcheck = false;
        nameDisplay.textContent = getTranslationCallback('cellEmptyDefault');
        nameDisplay.title = getTranslationCallback('renameHelp').replace(/<[^>]*>/g, '');
        cell.appendChild(nameDisplay);

        const keyDisplayBottom = document.createElement('div');
        keyDisplayBottom.classList.add('key-display-bottom');
        // Ensure fixedKey exists before calling toUpperCase
        keyDisplayBottom.textContent = fixedKey ? fixedKey.toUpperCase() : '';
        cell.appendChild(keyDisplayBottom);

        // Append cell to correct row based on index
        if (index >= 0 && index < 10) {
            window.soundboardApp.rowTop.appendChild(cell);
        } else if (index >= 10 && index < 19) {
            window.soundboardApp.rowHome.appendChild(cell);
        } else if (index >= 19 && index < 26) {
            window.soundboardApp.rowBottom.appendChild(cell);
        } else {
            console.warn(`Índice de célula fora do esperado: ${index}`);
            // Fallback for unexpected indices
            window.soundboardApp.soundboardGrid.appendChild(cell);
        }

        setupCellEvents(cell, index, soundData, playSoundCallback, loadFileIntoCellCallback, clearSoundCellCallback, fadeoutSoundCallback, toggleCueCallback, getTranslationCallback);

        // Initialize soundData slot as null (empty)
        soundData[index] = null;

        return cell;
    }

    function setupCellEvents(cell, index, soundData, playSoundCallback, loadFileIntoCellCallback, clearSoundCellCallback, fadeoutSoundCallback, toggleCueCallback, getTranslationCallback) {
        const longPressDuration = 500;
        let pressTimer;

        // Drag and Drop events
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });

        cell.addEventListener('drop', async (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && (file.type === 'audio/wav' || file.type === 'audio/mp3' || file.type === 'audio/ogg')) {
                await loadFileIntoCellCallback(file, cell, index, soundData, window.soundboardApp.audioContext, window.soundboardApp.cellManager.updateCellDisplay, getTranslationCallback, window.soundboardApp.settingsManager.saveSettings);
            } else {
                alert(getTranslationCallback('alertInvalidFile'));
            }
        });

        // Click events for cell (play/load)
        cell.addEventListener('click', async (e) => {
            // Prevent default click actions if a child button or editable div was clicked
            if (e.target.closest('.delete-button') ||
                e.target.closest('.replace-sound-button') ||
                e.target.closest('.loop-button') ||
                e.target.closest('.sound-name')) {
                e.stopPropagation();
                return;
            }

            // Ctrl + Click for cueing
            if (e.ctrlKey) {
                e.stopPropagation();
                toggleCueCallback(index, soundData, window.soundboardApp.cueGoSystem.getCuedSounds());
                return;
            }

            // If empty, open file picker
            if (cell.classList.contains('empty')) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'audio/mp3, audio/wav, audio/ogg';
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        await loadFileIntoCellCallback(file, cell, index, soundData, window.soundboardApp.audioContext, window.soundboardApp.cellManager.updateCellDisplay, getTranslationCallback, window.soundboardApp.settingsManager.saveSettings);
                    }
                };
                input.click();
            } else { // If filled, play sound
                playSoundCallback(index, soundData, window.soundboardApp.audioContext, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.globalActivePlayingInstances, window.soundboardApp.currentFadeInDuration, window.soundboardApp.currentFadeOutDuration, window.soundboardApp.volumeRange);
            }
        });

        // Sound name editing
        const nameDisplay = cell.querySelector('.sound-name');
        nameDisplay.addEventListener('blur', () => {
            if (soundData[index]) {
                soundData[index].name = nameDisplay.textContent.trim() || getTranslationCallback('cellNoName');
                nameDisplay.textContent = soundData[index].name; // Ensure actual displayed text matches data
                window.soundboardApp.settingsManager.saveSettings(window.soundboardApp.soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);
            }
        });
        nameDisplay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameDisplay.blur(); // Trigger blur to save changes
            }
        });

        // Delete button (quick click for delete, long press for fade out)
        const deleteButton = cell.querySelector('.delete-button');
        deleteButton.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevent cell click event
            pressTimer = setTimeout(() => {
                if (soundData[index] && soundData[index].audioBuffer) {
                    fadeoutSoundCallback(index, window.soundboardApp.currentFadeOutDuration, soundData, window.soundboardApp.audioContext, window.soundboardApp.globalActivePlayingInstances);
                }
                pressTimer = null; // Clear timer as long press action is taken
            }, longPressDuration);
        });

        deleteButton.addEventListener('mouseup', (e) => {
            e.stopPropagation(); // Prevent cell click event
            if (pressTimer !== null) {
                clearTimeout(pressTimer);
                if (e.button === 0 && !cell.classList.contains('empty')) { // Left click
                    clearSoundCellCallback(index, 0.1, soundData, window.soundboardApp.audioContext, window.soundboardApp.globalActivePlayingInstances, updateCellDisplay, getTranslationCallback, window.soundboardApp.settingsManager.saveSettings);
                }
            }
            pressTimer = null; // Clear timer
        });

        deleteButton.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
            pressTimer = null;
        });

        deleteButton.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default right-click menu
        });

        // Replace sound button
        const replaceButton = cell.querySelector('.replace-sound-button');
        replaceButton.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent cell click event
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/mp3, audio/wav, audio/ogg';
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    await loadFileIntoCellCallback(file, cell, index, soundData, window.soundboardApp.audioContext, window.soundboardApp.cellManager.updateCellDisplay, getTranslationCallback, window.soundboardApp.settingsManager.saveSettings);
                }
            };
            input.click();
        });

        // Loop button
        const loopButton = cell.querySelector('.loop-button');
        loopButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent cell click event
            if (soundData[index]) {
                soundData[index].isLooping = !soundData[index].isLooping;
                loopButton.classList.toggle('active', soundData[index].isLooping);
                window.soundboardApp.settingsManager.saveSettings(window.soundboardApp.soundData, window.soundboardApp.volumeRange, window.soundboardApp.playMultipleCheckbox, window.soundboardApp.autokillModeCheckbox, window.soundboardApp.fadeOutRange, window.soundboardApp.fadeInRange, window.soundboardApp.isHelpVisible);

                // Update active instances' loop status
                soundData[index].activePlayingInstances.forEach(instance => {
                    instance.source.loop = soundData[index].isLooping;
                });
            }
        });
    }

    function updateCellDisplay(cell, data, isEmpty, getTranslationCallback) {
        const nameDisplay = cell.querySelector('.sound-name');
        const loopButton = cell.querySelector('.loop-button');
        const deleteButton = cell.querySelector('.delete-button');
        const replaceButton = cell.querySelector('.replace-sound-button');
        const keyDisplayBottom = cell.querySelector('.key-display-bottom');

        cell.classList.toggle('empty', isEmpty);
        cell.classList.toggle('filled', !isEmpty);

        if (isEmpty) {
            nameDisplay.textContent = getTranslationCallback('cellEmptyDefault');
            cell.style.backgroundColor = ''; // Remove background color
            loopButton.classList.remove('active');
            loopButton.style.display = 'none'; // Hide loop button
            deleteButton.style.display = 'none'; // Hide delete button
            replaceButton.style.display = 'none'; // Hide replace button
            nameDisplay.contentEditable = false; // Disable editing for empty cells
            nameDisplay.classList.remove('editable'); // Remove editable class for styling
            // Ensure data.key exists before using it
            keyDisplayBottom.textContent = (data && data.key) ? data.key.toUpperCase() : '';
        } else {
            nameDisplay.textContent = data.name || getTranslationCallback('cellNoName');
            cell.style.backgroundColor = data.color || window.soundboardApp.utils.getRandomHSLColor(); // Ensure a color if missing
            loopButton.classList.toggle('active', data.isLooping);
            loopButton.style.display = 'block'; // Show loop button
            deleteButton.style.display = 'block'; // Show delete button
            replaceButton.style.display = 'block'; // Show replace button
            nameDisplay.contentEditable = true; // Enable editing for filled cells
            nameDisplay.classList.add('editable'); // Add editable class for styling
            // Ensure data.key exists before using it
            keyDisplayBottom.textContent = (data && data.key) ? data.key.toUpperCase() : '';
        }

        // Update cue state display
        if (data && data.isCued) {
            cell.classList.add('cued');
        } else {
            cell.classList.remove('cued');
        }
    }

    return {
        createSoundCell: createSoundCell,
        setupCellEvents: setupCellEvents, // Exposed for potential external use if needed
        updateCellDisplay: updateCellDisplay
    };
})();
