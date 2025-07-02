// settingsManager.js
// Gerencia o carregamento e salvamento de configurações e dados de som.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.settingsManager = (function() {

    function loadSettings(appState) { // <--- ALTERAÇÃO AQUI: Removido loadMultipleFilesIntoCellsCallback, ele não pertence aqui.
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        const savedHelpVisible = savedSettings.helpVisible !== undefined ? savedSettings.helpVisible : true;

        // --- Adição: Carregar o idioma guardado ---
        const savedLanguage = localStorage.getItem('soundboardLanguage') || 'pt'; // Define 'pt' como padrão se não houver guardado
        // ------------------------------------------

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
            // Removidas as linhas de display.style. Este é um comportamento visual que será gerido
            // pela função que toggle a ajuda, possivelmente no main.js
            appState.isHelpVisible = savedHelpVisible;
            if (savedHelpVisible) {
                // Ajudará a ter um texto temporário até o i18n carregar, ou simplesmente esperar.
                // Aqui estamos a usar getTranslation() que pode não estar carregado ainda.
                // O ideal é que o toggleHelp seja chamado APÓS o i18n.setLanguage().
                toggleHelpButton.textContent = (window.soundboardApp.i18n && window.soundboardApp.i18n.getTranslation) ?
                                                window.soundboardApp.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder') : 'Hide Help';
            } else {
                toggleHelpButton.textContent = (window.soundboardApp.i18n && window.soundboardApp.i18n.getTranslation) ?
                                                window.soundboardApp.i18n.getTranslation('toggleHelpButton') : 'Show Help';
            }
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
                window.soundboardApp.i18n.getTranslation,
                window.soundboardApp.audioManager.loadMultipleFilesIntoCells // <--- ALTERAÇÃO AQUI: Passando a referência correta do audioManager
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
                window.soundboardApp.cellManager.updateCellDisplay(cell, { name: (window.soundboardApp.i18n.getTranslation ? window.soundboardApp.i18n.getTranslation('cellEmptyDefault') : 'Empty'), key: appState.defaultKeys[i] || '', isLooping: false, isCued: false }, true, window.soundboardApp.i18n.getTranslation);
                appState.soundData[i] = null; // Explicitly set to null if no valid data
            }
        }
        // --- Adição: Retornar o idioma salvo ---
        return savedLanguage; // Retorna o idioma carregado (ou 'pt' se não houver)
        // ------------------------------------------
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
                name: data ? data.name : null,
                key: data ? data.key : null,
                color: data ? data.color : null,
                isLooping: data ? data.isLooping : false,
                isCued: data ? data.isCued : false // Save cued state
            }))
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
    }

    // --- Adição: Função para salvar apenas o idioma ---
    function saveLanguage(lang) {
        localStorage.setItem('soundboardLanguage', lang);
    }
    // ---------------------------------------------------

    return {
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        saveLanguage: saveLanguage // Expor a nova função
    };
})();
