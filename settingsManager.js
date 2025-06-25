// settingsManager.js
// Gerencia o carregamento e salvamento de configurações e dados de som.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.settingsManager = (function() {

    function loadSettings(appState) {
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        const savedHelpVisible = savedSettings.helpVisible !== undefined ? savedSettings.helpVisible : true;

        appState.volumeRange.value = savedSettings.volume !== undefined ? savedSettings.volume : 0.75;
        appState.playMultipleCheckbox.checked = savedSettings.playMultiple !== undefined ? savedSettings.playMultiple : false;
        appState.autokillModeCheckbox.checked = savedSettings.autokillMode !== undefined ? savedSettings.autokillMode : false;
        appState.fadeInRange.value = savedSettings.currentFadeInDuration !== undefined ? savedSettings.currentFadeInDuration : 0;
        appState.fadeOutRange.value = savedSettings.currentFadeOutDuration !== undefined ? savedSettings.currentFadeOutDuration : 0;
        appState.currentFadeInDuration = parseFloat(appState.fadeInRange.value);
        appState.currentFadeOutDuration = parseFloat(appState.fadeOutRange.value);

        // Update UI based on loaded settings
        window.soundboardApp.utils.updateVolumeDisplay(appState.volumeRange, appState.volumeDisplay);
        // Fade displays will be updated by i18n.setLanguage after translations load

        // Handle help text visibility
        const helpTextContent = document.getElementById('help-text-content');
        const toggleHelpButton = document.getElementById('toggle-help-button');
        if (helpTextContent && toggleHelpButton) {
            if (savedHelpVisible) {
                helpTextContent.style.display = 'block';
                // This text will be correctly set by i18n.setLanguage later
                // For immediate visual consistency, you might want a temporary text or a partial update
                toggleHelpButton.textContent = window.soundboardApp.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder');
            } else {
                helpTextContent.style.display = 'none';
                toggleHelpButton.textContent = window.soundboardApp.i18n.getTranslation('toggleHelpButton');
            }
            appState.isHelpVisible = savedHelpVisible;
        }


        for (let i = 0; i < appState.NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cell = window.soundboardApp.cellManager.createSoundCell(
                i,
                appState.defaultKeys[i],
                appState.soundData,
                window.soundboardApp.audioManager.playSound,
                window.soundboardApp.audioManager.loadFileIntoCell,
                window.soundboardApp.audioManager.clearSoundCell,
                window.soundboardApp.audioManager.fadeoutSound,
                window.soundboardApp.cueGoSystem.toggleCue,
                window.soundboardApp.i18n.getTranslation
            );

            // Check if cellData exists and audioDataUrl is a valid string
            if (cellData && typeof cellData.audioDataUrl === 'string' && cellData.audioDataUrl.startsWith('data:audio')) {
                const color = cellData.color || window.soundboardApp.utils.getRandomHSLColor();
                const isLooping = cellData.isLooping !== undefined ? cellData.isLooping : false;
                const isCued = cellData.isCued !== undefined ? cellData.isCued : false;

                // Re-load the sound from data URL
                window.soundboardApp.audioManager.loadSoundFromDataURL(
                    cellData.audioDataUrl,
                    cell,
                    i,
                    cellData.name,
                    appState.defaultKeys[i], // Pass fixedKey
                    color,
                    isLooping,
                    isCued, // Pass isCued state
                    appState.soundData,
                    appState.audioContext,
                    window.soundboardApp.cellManager.updateCellDisplay,
                    window.soundboardApp.i18n.getTranslation,
                    window.soundboardApp.settingsManager.saveSettings // Pass saveSettings callback
                );
            } else {
                // Ensure default key is passed for empty cells too
                window.soundboardApp.cellManager.updateCellDisplay(cell, { name: window.soundboardApp.i18n.getTranslation('cellEmptyDefault'), key: appState.defaultKeys[i], isLooping: false, isCued: false }, true, window.soundboardApp.i18n.getTranslation);
                appState.soundData[i] = null; // Explicitly set to null if no valid data
            }
        }
    }

    function saveSettings(soundData, volumeRange, playMultipleCheckbox, autokillModeCheckbox, fadeOutRange, fadeInRange, isHelpVisible) {
        const settingsToSave = {
            volume: parseFloat(volumeRange.value),
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            currentFadeOutDuration: parseFloat(fadeOutRange.value),
            currentFadeInDuration: parseFloat(fadeInRange.value),
            helpVisible: isHelpVisible, // Save help text visibility
            sounds: soundData.map(data => ({
                // Ensure audioDataUrl is null for empty cells, not undefined
                name: data ? data.name : null,
                key: data ? data.key : null,
                audioDataUrl: data ? data.audioDataUrl : null,
                color: data ? data.color : null,
                isLooping: data ? data.isLooping : false,
                isCued: data ? data.isCued : false // Save cued state
            }))
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
    }

    return {
        loadSettings: loadSettings,
        saveSettings: saveSettings
    };
})();
