// js/sessionManager.js
// Gerencia o guardar, carregar e apagar de sessões da soundboard.

window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.sessionManager = (function() {
    const SESSION_STORAGE_KEY = 'soundboard_sessions'; // Key for storing all sessions

    let loadSessionModal;
    let sessionListElement;
    let confirmLoadButton;
    let cancelLoadButton;
    let selectedSessionKey = null;

    // --- Helper Functions ---

    /**
     * Retrieves all saved sessions from localStorage.
     * @returns {Object} An object where keys are session names and values are session data.
     */
    function getAllSessions() {
        try {
            const sessions = localStorage.getItem(SESSION_STORAGE_KEY);
            return sessions ? JSON.parse(sessions) : {};
        } catch (e) {
            console.error("Erro ao ler sessões do localStorage:", e);
            return {};
        }
    }

    /**
     * Saves the entire sessions object back to localStorage.
     * @param {Object} sessions - The object containing all session data.
     */
    function saveAllSessions(sessions) {
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
        } catch (e) {
            console.error("Erro ao salvar sessões no localStorage:", e);
            // CORRIGIDO: Chamar i18n.getTranslation corretamente
            alert(window.soundboardApp.i18n.getTranslation('alertSessionSaveError') + `\nDetalhes: ${e.message}`);
        }
    }

    /**
     * Gets a timestamp string for session naming.
     * @returns {string} Formatted date and time string.
     */
    function getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}_${hours}${minutes}`;
    }

    // --- Public Functions ---

    /**
     * Saves the current soundboard state as a new session.
     * @param {Array<Object|null>} soundData - The array of sound data for all cells.
     * @param {HTMLInputElement} volumeRange - The global volume slider element.
     * @param {HTMLInputElement} playMultipleCheckbox - The "Play Multiple" checkbox.
     * @param {HTMLInputElement} autokillModeCheckbox - The "Autokill Mode" checkbox.
     * @param {HTMLInputElement} fadeOutRange - The fade out slider.
     * @param {HTMLInputElement} fadeInRange - The fade in slider.
     * @param {boolean} isHelpVisible - Whether the help text is visible.
     */
    function saveCurrentSession(soundData, volumeRange, playMultipleCheckbox, autokillModeCheckbox, fadeOutRange, fadeInRange, isHelpVisible) {
        // Collect minimal data needed for each sound to minimize storage size
        const serializableSoundData = soundData.map(sound => {
            if (sound && sound.audioDataUrl) {
                return {
                    name: sound.name,
                    key: sound.key,
                    audioDataUrl: sound.audioDataUrl, // The base64 audio data
                    color: sound.color,
                    isLooping: sound.isLooping,
                    isCued: sound.isCued
                };
            }
            return null; // Empty cell
        });

        // CORRIGIDO: Chamar i18n.getTranslation corretamente
        const sessionName = prompt(window.soundboardApp.i18n.getTranslation('promptSaveSessionName') + ` (e.g., MinhaSessao_${getTimestamp()})`);
        if (!sessionName) {
            // CORRIGIDO: Chamar i18n.getTranslation corretamente
            alert(window.soundboardApp.i18n.getTranslation('alertSaveCancelled'));
            return;
        }

        const sessions = getAllSessions();
        if (sessions[sessionName]) {
            // CORRIGIDO: Chamar i18n.getTranslation corretamente
            if (!confirm(window.soundboardApp.i18n.getTranslation('confirmOverwriteSession').replace('{sessionName}', sessionName))) {
                // CORRIGIDO: Chamar i18n.getTranslation corretamente
                alert(window.soundboardApp.i18n.getTranslation('alertSaveCancelled'));
                return;
            }
        }

        sessions[sessionName] = {
            soundData: serializableSoundData,
            globalVolume: volumeRange.value,
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            fadeOutDuration: fadeOutRange.value,
            fadeInDuration: fadeInRange.value,
            isHelpVisible: isHelpVisible,
            timestamp: new Date().toISOString() // Store ISO string for sorting/display
        };

        saveAllSessions(sessions);
        // CORRIGIDO: Chamar i18n.getTranslation corretamente
        alert(window.soundboardApp.i18n.getTranslation('alertSessionSaved').replace('{sessionName}', sessionName));
    }

    /**
     * Populates the session list in the load session modal.
     */
    function populateSessionList() {
        sessionListElement.innerHTML = ''; // Clear existing list
        const sessions = getAllSessions();
        const sessionKeys = Object.keys(sessions).sort((a, b) => {
            // Sort by timestamp, newest first
            const dateA = new Date(sessions[a].timestamp || 0); // Use 0 for fallback
            const dateB = new Date(sessions[b].timestamp || 0);
            return dateB.getTime() - dateA.getTime();
        });

        if (sessionKeys.length === 0) {
            const li = document.createElement('li');
            // CORRIGIDO: Chamar i18n.getTranslation corretamente
            li.textContent = window.soundboardApp.i18n.getTranslation('noSessionsSaved');
            li.style.fontStyle = 'italic';
            li.style.color = '#aaa';
            sessionListElement.appendChild(li);
            confirmLoadButton.disabled = true; // Disable load if no sessions
            return;
        }

        confirmLoadButton.disabled = true; // Initially disable load until a session is selected
        selectedSessionKey = null; // Reset selected session

        sessionKeys.forEach(key => {
            const session = sessions[key];
            const li = document.createElement('li');
            li.dataset.sessionKey = key;

            // CORRIGIDO: Chamar i18n.getTranslation corretamente
            const date = session.timestamp ? new Date(session.timestamp).toLocaleString() : window.soundboardApp.i18n.getTranslation('unknownDate');
            li.innerHTML = `<span>${key} <small>(${date})</small></span>`;

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-session-button');
            deleteButton.innerHTML = '<span class="material-symbols-outlined">delete</span>';
            // CORRIGIDO: Chamar i18n.getTranslation corretamente
            deleteButton.title = window.soundboardApp.i18n.getTranslation('deleteSession');
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent li click event
                deleteSession(key);
            });
            li.appendChild(deleteButton);

            li.addEventListener('click', () => {
                // Remove 'selected' class from all others
                sessionListElement.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
                // Add 'selected' class to the clicked one
                li.classList.add('selected');
                selectedSessionKey = key;
                confirmLoadButton.disabled = false; // Enable load button
            });
            sessionListElement.appendChild(li);
        });
    }

    /**
     * Displays the load session modal.
     */
    function showLoadSessionModal() {
        populateSessionList();
        loadSessionModal.style.display = 'block';
    }

    /**
     * Hides the load session modal.
     */
    function hideLoadSessionModal() {
        loadSessionModal.style.display = 'none';
        selectedSessionKey = null;
        confirmLoadButton.disabled = true;
    }

    /**
     * Loads a selected session.
     * @param {Object} appState - The main application state object (e.g., window.soundboardApp.sb from main.js)
     * @param {Function} updateCellDisplay - Callback to update individual cell display.
     * @param {Function} getTranslation - Callback to get translations.
     * @param {Function} saveSettingsCallback - Callback to save current settings after loading.
     */
    async function loadSelectedSession(appState, updateCellDisplay, getTranslation, saveSettingsCallback) {
        if (!selectedSessionKey) {
            alert(getTranslation('alertNoSessionSelected'));
            return;
        }

        if (!confirm(getTranslation('confirmLoadSession').replace('{sessionName}', selectedSessionKey))) {
            return;
        }

        const sessions = getAllSessions();
        const sessionToLoad = sessions[selectedSessionKey];

        if (!sessionToLoad) {
            alert(getTranslation('alertSessionNotFound').replace('{sessionName}', selectedSessionKey));
            return;
        }

        hideLoadSessionModal(); // Hide modal immediately

        // 1. Stop all currently playing sounds and clear existing data
        window.soundboardApp.audioManager.stopAllSounds(
            appState.audioContext,
            appState.globalActivePlayingInstances,
            appState.soundData,
            0.2 // A small fade out
        );
        window.soundboardApp.cueGoSystem.removeAllCues(appState.soundData); // Clear all cues from existing data

        // 2. Clear visual representation of all cells
        for (let i = 0; i < window.soundboardApp.NUM_CELLS; i++) {
            const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
            if (cell) {
                updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
                cell.classList.remove('active', 'playing-feedback');
            }
            // Ensure soundData array is also cleared for proper loading
            appState.soundData[i] = null;
        }


        // 3. Load global settings
        if (sessionToLoad.globalVolume !== undefined) {
            appState.volumeRange.value = sessionToLoad.globalVolume;
            appState.utils.updateVolumeDisplay(appState.volumeRange, appState.volumeDisplay);
            if (appState.masterGainNode) {
                appState.masterGainNode.gain.value = sessionToLoad.globalVolume;
            }
        }
        if (sessionToLoad.playMultiple !== undefined) {
            appState.playMultipleCheckbox.checked = sessionToLoad.playMultiple;
        }
        if (sessionToLoad.autokillMode !== undefined) {
            appState.autokillModeCheckbox.checked = sessionToLoad.autokillMode;
        }
        if (sessionToLoad.fadeOutDuration !== undefined) {
            appState.fadeOutRange.value = sessionToLoad.fadeOutDuration;
            appState.utils.updateFadeOutDisplay(appState.fadeOutRange, appState.fadeOutDisplay, appState.i18n.getTranslationsObject(), appState.i18n.getCurrentLanguage());
        }
        if (sessionToLoad.fadeInDuration !== undefined) {
            appState.fadeInRange.value = sessionToLoad.fadeInDuration;
            appState.utils.updateFadeInDisplay(appState.fadeInRange, appState.fadeInDisplay, appState.i18n.getTranslationsObject(), appState.i18n.getCurrentLanguage());
        }
        if (sessionToLoad.isHelpVisible !== undefined) {
            appState.isHelpVisible = sessionToLoad.isHelpVisible; // Update the state
            // It seems 'toggleHelp' is not directly exposed or used in main.js
            // Instead, update the class on helpTextContent directly based on isHelpVisible
            if (appState.isHelpVisible) {
                appState.helpTextContent.classList.add('visible');
                // Ensure the button text also updates
                appState.toggleHelpButton.textContent = appState.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder');
            } else {
                appState.helpTextContent.classList.remove('visible');
                // Ensure the button text also updates
                appState.toggleHelpButton.textContent = appState.i18n.getTranslation('toggleHelpButton');
            }
        }


        // 4. Load sound data for each cell
        const loadPromises = sessionToLoad.soundData.map(async (soundDataEntry, index) => {
            if (soundDataEntry && soundDataEntry.audioDataUrl) {
                const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                if (cell) {
                    try {
                        await window.soundboardApp.audioManager.loadSoundFromDataURL(
                            soundDataEntry.audioDataUrl,
                            cell,
                            index,
                            soundDataEntry.name,
                            soundDataEntry.key,
                            soundDataEntry.color,
                            soundDataEntry.isLooping,
                            soundDataEntry.isCued,
                            appState.soundData, // Pass the main soundData array
                            appState.audioContext,
                            updateCellDisplay,
                            getTranslation,
                            saveSettingsCallback // Pass the save callback
                        );
                        // After loading sound, ensure cued state is applied if it was saved as cued
                        if (soundDataEntry.isCued) {
                            const loadedSound = appState.soundData[index];
                            if(loadedSound) { // Check if loading was successful
                                loadedSound.isCued = true; // Explicitly set cued state
                                cell.classList.add('cued');
                                // Add to cue system's internal list if it exists and needs it
                                window.soundboardApp.cueGoSystem.addCue(index, appState.soundData);
                            }
                        }
                    } catch (error) {
                        console.error(`Erro ao carregar som para célula ${index} da sessão:`, error);
                        alert(getTranslation('alertLoadSoundFromSessionError').replace('{soundName}', soundDataEntry.name || 'N/A') + `\nDetalhes: ${error.message}`);
                        // Ensure the cell is marked as empty on failure
                        updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[index] || '', isLooping: false, isCued: false }, true, getTranslation);
                        appState.soundData[index] = null;
                    }
                }
            } else {
                // Ensure the cell is explicitly set to empty if no data or invalid data
                const cell = document.querySelector(`.sound-cell[data-index="${index}"]`);
                if (cell) {
                    updateCellDisplay(cell, { name: getTranslation('cellEmptyDefault'), key: window.soundboardApp.defaultKeys[index] || '', isLooping: false, isCued: false }, true, getTranslation);
                }
                appState.soundData[index] = null;
            }
        });

        await Promise.all(loadPromises);

        // 5. Re-save settings after all sounds are potentially loaded to ensure consistency
        // This will persist the loaded session's state (including newly loaded Data URLs)
        saveSettingsCallback(appState.soundData, appState.volumeRange, appState.playMultipleCheckbox, appState.autokillModeCheckbox, appState.fadeOutRange, appState.fadeInRange, appState.isHelpVisible);

        alert(getTranslation('alertSessionLoaded').replace('{sessionName}', selectedSessionKey));
    }

    /**
     * Deletes a session from localStorage.
     * @param {string} sessionKey - The key (name) of the session to delete.
     */
    function deleteSession(sessionKey) {
        // CORRIGIDO: Chamar i18n.getTranslation corretamente
        if (confirm(window.soundboardApp.i18n.getTranslation('confirmDeleteSession').replace('{sessionName}', sessionKey))) {
            const sessions = getAllSessions();
            delete sessions[sessionKey];
            saveAllSessions(sessions);
            populateSessionList(); // Refresh the list
            // CORRIGIDO: Chamar i18n.getTranslation corretamente
            alert(window.soundboardApp.i18n.getTranslation('alertSessionDeleted').replace('{sessionName}', sessionKey));
        }
    }

    /**
     * Initializes the session manager, setting up modal elements and event listeners.
     * @param {HTMLElement} loadSessionModalElement - The modal container element.
     * @param {HTMLElement} sessionListElem - The <ul> element for displaying sessions.
     * @param {HTMLElement} confirmButton - The confirm load button.
     * @param {HTMLElement} cancelButton - The cancel load button.
     */
    function init(loadSessionModalElement, sessionListElem, confirmButton, cancelButton) {
        loadSessionModal = loadSessionModalElement;
        sessionListElement = sessionListElem;
        confirmLoadButton = confirmButton;
        cancelButton = cancelButton;

        if (confirmLoadButton) {
            confirmButton.addEventListener('click', () => { /* Logic in main.js */ });
        }
        if (cancelButton) {
            cancelButton.addEventListener('click', hideLoadSessionModal);
        }

        // Close modal when clicking outside (on the overlay)
        if (loadSessionModal) {
            loadSessionModal.addEventListener('click', (event) => {
                if (event.target === loadSessionModal) {
                    hideLoadSessionModal();
                }
            });
        }
    }

    return {
        init: init,
        saveCurrentSession: saveCurrentSession,
        showLoadSessionModal: showLoadSessionModal,
        loadSelectedSession: loadSelectedSession,
        deleteSession: deleteSession
    };
})();
