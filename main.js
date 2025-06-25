// main.js
// Configuração inicial, variáveis globais e ouvintes de eventos globais.
// Orquestra a interação entre os outros módulos.

document.addEventListener('DOMContentLoaded', () => {
    // 1. Variáveis Globais e Elementos do DOM
    // Torna-os acessíveis globalmente através do objeto window.soundboardApp
    window.soundboardApp = window.soundboardApp || {};

    const sb = window.soundboardApp; // Alias for convenience

    // Elementos principais do DOM
    sb.soundboardGrid = document.querySelector('.soundboard-grid'); // Changed from ID to class based on your HTML
    sb.rowTop = document.getElementById('row-top');
    sb.rowHome = document.getElementById('row-home');
    sb.rowBottom = document.getElementById('row-bottom');

    sb.volumeRange = document.getElementById('volume-range');
    sb.volumeDisplay = document.getElementById('volume-display');
    sb.playMultipleCheckbox = document.getElementById('play-multiple');
    sb.autokillModeCheckbox = document.getElementById('autokill-mode');
    sb.stopAllSoundsBtn = document.getElementById('stop-all-sounds');
    sb.loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');
    sb.fadeOutRange = document.getElementById('fadeOut-range');
    sb.fadeOutDisplay = document.getElementById('fadeout-display');
    sb.fadeInRange = document.getElementById('fadeIn-range');
    sb.fadeInDisplay = document.getElementById('fadeIn-display');
    sb.langButtons = document.querySelectorAll('.lang-button');
    sb.titleElement = document.querySelector('title');
    sb.allDataKeyElements = document.querySelectorAll('[data-key]');
    sb.soundCells = document.querySelectorAll('.sound-cell'); // Will be populated by cellManager initially, and then re-queried

    // New DOM elements
    sb.clearAllCellsBtn = document.getElementById('clear-all-cells');
    sb.toggleHelpButton = document.getElementById('toggle-help-button');
    sb.helpTextContent = document.getElementById('help-text-content');
    sb.stopConfirmationPopup = document.getElementById('stop-confirmation-popup');
    sb.confirmStopYesBtn = document.getElementById('confirm-stop-yes');
    sb.confirmStopNoBtn = document.getElementById('confirm-stop-no');


    // Estado da Aplicação
    sb.audioContext = null; // Initialized by audioManager.initAudioContext
    sb.masterGainNode = null; // Will be set by audioManager.initAudioContext
    sb.soundData = []; // { name, key, audioBuffer, audioDataUrl, activePlayingInstances: Set<{source: AudioBufferSourceNode, gain: GainNode}>, color, isLooping, isCued }
    sb.globalActivePlayingInstances = new Set(); // Armazena {source, gainNode} de todas as instâncias a tocar
    sb.currentFadeOutDuration = 0;
    sb.currentFadeInDuration = 0;
    sb.isHelpVisible = true; // Default state for help text visibility


    sb.defaultKeys = [
        'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
        'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
        'z', 'x', 'c', 'v', 'b', 'n', 'm'
    ];
    sb.NUM_CELLS = sb.defaultKeys.length;


    // 2. Carregar Traduções e Configurações Iniciais
    sb.i18n.loadTranslations((lang) => {
        sb.currentLanguage = lang; // Set global currentLanguage
        sb.settingsManager.loadSettings(sb); // Load settings after translations are ready

        // Re-query soundCells as they are created dynamically by loadSettings
        sb.soundCells = document.querySelectorAll('.sound-cell');

        // Re-apply language specific texts after settings are loaded and cells are created/updated
        sb.i18n.setLanguage(
            sb.currentLanguage,
            {
                titleElement: sb.titleElement,
                allDataKeyElements: sb.allDataKeyElements,
                fadeOutRange: sb.fadeOutRange,
                fadeOutDisplay: sb.fadeOutDisplay,
                fadeInRange: sb.fadeInRange,
                fadeInDisplay: sb.fadeInDisplay,
                soundCells: sb.soundCells, // Use the re-queried list
                langButtons: sb.langButtons
            },
            sb.soundData,
            sb.cellManager.updateCellDisplay,
            sb.utils
        );

        // After all cells are created and potentially loaded, update cues from saved settings
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        const cuedIndicesFromSave = savedSounds.filter(s => s && s.isCued).map((s, idx) => idx);
        sb.cueGoSystem.setCuedSounds(cuedIndicesFromSave, sb.soundData); // Set cued state based on saved data
    });


    // 3. Ouvintes de Eventos Globais

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        // Prevent default actions for editable elements
        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            return;
        }

        // Logic for Space and Ctrl + Space (QLab style navigation)
        if (pressedKey === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) { // Just Space (GO)
            e.preventDefault();
            let targetIndex;
            const lastPlayed = sb.audioManager.getLastPlayedSoundIndex();

            if (lastPlayed === null) {
                targetIndex = sb.cueGoSystem.findNextSoundIndex(-1, 1, sb.soundData, sb.NUM_CELLS);
            } else {
                targetIndex = sb.cueGoSystem.findNextSoundIndex(lastPlayed, 1, sb.soundData, sb.NUM_CELLS);
            }

            if (targetIndex !== null) {
                sb.audioManager.playSound(targetIndex, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
            } else {
                // If no sound is found after the last played, wrap around to the first, if any
                const firstSound = sb.cueGoSystem.findNextSoundIndex(-1, 1, sb.soundData, sb.NUM_CELLS);
                if (firstSound !== null) {
                    sb.audioManager.playSound(firstSound, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
                } else {
                    console.log(sb.i18n.getTranslation("noMoreSoundsForward"));
                }
            }
            return;
        } else if (pressedKey === ' ' && e.ctrlKey) { // Ctrl + Space (GO-)
            e.preventDefault();
            let targetIndex;
            const lastPlayed = sb.audioManager.getLastPlayedSoundIndex();

            if (lastPlayed === null) { // If nothing played, start from the end and go backwards
                targetIndex = sb.cueGoSystem.findNextSoundIndex(sb.NUM_CELLS, -1, sb.soundData, sb.NUM_CELLS);
            } else {
                targetIndex = sb.cueGoSystem.findNextSoundIndex(lastPlayed, -1, sb.soundData, sb.NUM_CELLS);
            }

            if (targetIndex !== null) {
                sb.audioManager.playSound(targetIndex, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
            } else {
                // If no sound is found before the last played, wrap around to the last, if any
                const lastSound = sb.cueGoSystem.findNextSoundIndex(sb.NUM_CELLS, -1, sb.soundData, sb.NUM_CELLS);
                if (lastSound !== null) {
                    sb.audioManager.playSound(lastSound, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
                } else {
                    console.log(sb.i18n.getTranslation("noMoreSoundsBackward"));
                }
            }
            return;
        }

        // Keyboard shortcuts for Cue/Go
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.ctrlKey) { // Ctrl + Enter: Toggle cue for the last played sound
                const lastPlayed = sb.audioManager.getLastPlayedSoundIndex();
                if (lastPlayed !== null && sb.soundData[lastPlayed]) {
                    sb.cueGoSystem.toggleCue(lastPlayed, sb.soundData, sb.cueGoSystem.getCuedSounds());
                }
            } else if (e.shiftKey) { // Shift + Enter: Stop all cued sounds
                sb.cueGoSystem.stopCuedSounds(sb.soundData, sb.audioContext, sb.audioManager.fadeoutSound, sb.globalActivePlayingInstances);
            } else if (e.altKey) { // Alt + Enter: Remove all cues without stopping
                sb.cueGoSystem.removeAllCues(sb.soundData);
            } else { // Enter (no modifiers): Play all cued sounds
                sb.cueGoSystem.playCuedSounds(sb.soundData, sb.audioContext, sb.audioManager.playSound, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
            }
            return;
        }

        // Volume control with arrow keys
        if (pressedKey === 'arrowup') {
            e.preventDefault();
            sb.volumeRange.value = Math.min(1, parseFloat(sb.volumeRange.value) + 0.05);
            sb.utils.updateVolumeDisplay(sb.volumeRange, sb.volumeDisplay);
            if (sb.audioContext && sb.masterGainNode) {
                sb.masterGainNode.gain.value = sb.volumeRange.value;
            }
            sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
        } else if (pressedKey === 'arrowdown') {
            e.preventDefault();
            sb.volumeRange.value = Math.max(0, parseFloat(sb.volumeRange.value) - 0.05);
            sb.utils.updateVolumeDisplay(sb.volumeRange, sb.volumeDisplay);
            if (sb.audioContext && sb.masterGainNode) {
                sb.masterGainNode.gain.value = sb.volumeRange.value;
            }
            sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
        } else if (pressedKey === 'escape') {
            // Show confirmation popup for stopping all sounds
            sb.stopConfirmationPopup.style.display = 'flex';
        } else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') { // Ctrl + 0-9 for Fade In
            e.preventDefault();
            sb.fadeInRange.value = parseInt(pressedKey);
            sb.currentFadeInDuration = parseFloat(sb.fadeInRange.value);
            sb.utils.updateFadeInDisplay(sb.fadeInRange, sb.fadeInDisplay, sb.i18n.getTranslationsObject(), sb.i18n.getCurrentLanguage());
            sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
        } else if (pressedKey >= '0' && pressedKey <= '9' && !e.ctrlKey && !e.altKey && !e.shiftKey) { // 0-9 for Fade Out
            e.preventDefault();
            sb.fadeOutRange.value = parseInt(pressedKey);
            sb.currentFadeOutDuration = parseFloat(sb.fadeOutRange.value);
            sb.utils.updateFadeOutDisplay(sb.fadeOutRange, sb.fadeOutDisplay, sb.i18n.getTranslationsObject(), sb.i18n.getCurrentLanguage());
            sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
        } else {
            // Play sound via QWERTY key
            const indexToPlay = sb.defaultKeys.indexOf(pressedKey);
            if (indexToPlay !== -1 && sb.soundData[indexToPlay] && sb.soundData[indexToPlay].audioBuffer) {
                sb.audioManager.playSound(indexToPlay, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
            }
        }
    });

    // Control panel listeners
    sb.fadeInRange.addEventListener('input', () => {
        sb.currentFadeInDuration = parseFloat(sb.fadeInRange.value);
        sb.utils.updateFadeInDisplay(sb.fadeInRange, sb.fadeInDisplay, sb.i18n.getTranslationsObject(), sb.i18n.getCurrentLanguage());
        sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
    });

    sb.fadeOutRange.addEventListener('input', () => {
        sb.currentFadeOutDuration = parseFloat(sb.fadeOutRange.value);
        sb.utils.updateFadeOutDisplay(sb.fadeOutRange, sb.fadeOutDisplay, sb.i18n.getTranslationsObject(), sb.i18n.getCurrentLanguage());
        sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
    });

    sb.volumeRange.addEventListener('input', () => {
        sb.utils.updateVolumeDisplay(sb.volumeRange, sb.volumeDisplay);
        if (sb.audioContext && sb.masterGainNode) {
            sb.masterGainNode.gain.value = sb.volumeRange.value;
        }
        sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
    });

    sb.playMultipleCheckbox.addEventListener('change', () => {
        sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
    });

    sb.autokillModeCheckbox.addEventListener('change', () => {
        sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
    });

    // Stop All Sounds Button (with confirmation)
    sb.stopAllSoundsBtn.addEventListener('click', () => {
        sb.stopConfirmationPopup.style.display = 'flex';
    });

    sb.confirmStopYesBtn.addEventListener('click', () => {
        sb.stopConfirmationPopup.style.display = 'none';
        sb.audioManager.stopAllSounds(sb.audioContext, sb.globalActivePlayingInstances, sb.soundData);
    });

    sb.confirmStopNoBtn.addEventListener('click', () => {
        sb.stopConfirmationPopup.style.display = 'none';
    });

    // Load Multiple Sounds Button
    sb.loadSoundsButtonGeneral.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/mp3, audio/wav, audio/ogg';
        input.multiple = true;

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            let startIndex = 0;

            for (const file of files) {
                let foundEmptyCell = false;
                // Find the next empty cell, starting from startIndex
                for (let i = startIndex; i < sb.NUM_CELLS; i++) {
                    if (sb.soundData[i] === null || (sb.soundData[i] && sb.soundData[i].audioBuffer === null)) {
                        const cell = document.querySelector(`.sound-cell[data-index="${i}"]`);
                        await sb.audioManager.loadFileIntoCell(file, cell, i, sb.soundData, sb.audioContext, sb.cellManager.updateCellDisplay, sb.i18n.getTranslation, sb.settingsManager.saveSettings);
                        startIndex = i + 1; // Update start index for next file
                        foundEmptyCell = true;
                        break;
                    }
                }
                if (!foundEmptyCell) {
                    alert(sb.i18n.getTranslation('alertNoEmptyCells').replace('{fileName}', file.name));
                    break; // Stop loading if no more empty cells
                }
            }
        };
        input.click();
    });

    // Clear All Cells Button
    sb.clearAllCellsBtn.addEventListener('click', () => {
        sb.audioManager.clearAllSoundCells(sb.soundData, sb.audioContext, sb.globalActivePlayingInstances, sb.NUM_CELLS, sb.cellManager.updateCellDisplay, sb.i18n.getTranslation, sb.settingsManager.saveSettings);
    });

    // Language Buttons
    sb.langButtons.forEach(button => {
        button.addEventListener('click', () => {
            sb.i18n.setLanguage(
                button.dataset.lang,
                {
                    titleElement: sb.titleElement,
                    allDataKeyElements: sb.allDataKeyElements,
                    fadeOutRange: sb.fadeOutRange,
                    fadeOutDisplay: sb.fadeOutDisplay,
                    fadeInRange: sb.fadeInRange,
                    fadeInDisplay: sb.fadeInDisplay,
                    soundCells: document.querySelectorAll('.sound-cell'), // Re-query after language change if cells updated
                    langButtons: sb.langButtons
                },
                sb.soundData,
                sb.cellManager.updateCellDisplay,
                sb.utils
            );
        });
    });

    // Toggle Help Button
    sb.toggleHelpButton.addEventListener('click', () => {
        sb.isHelpVisible = !sb.isHelpVisible;
        if (sb.isHelpVisible) {
            sb.helpTextContent.style.display = 'block';
            sb.toggleHelpButton.textContent = sb.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder');
        } else {
            sb.helpTextContent.style.display = 'none';
            sb.toggleHelpButton.textContent = sb.i18n.getTranslation('toggleHelpButton');
        }
        sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
    });

    // Resume AudioContext on first user interaction
    document.body.addEventListener('click', () => {
        if (sb.audioContext && sb.audioContext.state === 'suspended') {
            sb.audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
