// main.js

// Garante que o objeto global soundboardApp existe e inicializa as suas propriedades
window.soundboardApp = window.soundboardApp || {};
window.soundboardApp.soundData = {}; // Objeto para armazenar dados dos sons
window.soundboardApp.globalActivePlayingInstances = []; // Array para todas as instâncias de som ativas
window.soundboardApp.defaultKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm'];
window.soundboardApp.NUM_CELLS = window.soundboardApp.defaultKeys.length;
window.soundboardApp.isHelpVisible = true; // Estado inicial da ajuda, será carregado das settings

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar o AudioContext
    window.soundboardApp.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 2. Definir referências DOM Elementos para i18n
    const domElements = {
        titleElement: document.querySelector('title'),
        allDataKeyElements: document.querySelectorAll('[data-key]'),
        fadeOutRange: document.getElementById('fadeOut-range'),
        fadeOutDisplay: document.getElementById('fadeout-display'),
        fadeInRange: document.getElementById('fadeIn-range'),
        fadeInDisplay: document.getElementById('fadeIn-display'),
        volumeRange: document.getElementById('volume-range'), // Adicionar volumeRange aqui
        volumeDisplay: document.getElementById('volume-display'), // Adicionar volumeDisplay aqui
        playMultipleCheckbox: document.getElementById('play-multiple'),
        autokillModeCheckbox: document.getElementById('autokill-mode'),
        soundCells: document.querySelectorAll('.sound-cell'), // Será preenchido por cellManager.createSoundCell
        langButtons: document.querySelectorAll('.lang-button')
    };
    window.soundboardApp.domElements = domElements; // Adiciona ao escopo global para acesso


    // 3. Carregar Traduções primeiro
    // A função loadTranslations agora não recebe um callback setLanguage.
    // Ela apenas carrega as traduções e as torna disponíveis.
    await window.soundboardApp.i18n.loadTranslations();

    // 4. Carregar Configurações (inclui o idioma salvo)
    // Passar domElements, pois setLanguage precisa deles
    const loadedLanguage = window.soundboardApp.settingsManager.loadSettings(window.soundboardApp);

    // 5. Aplicar o idioma carregado (ou o padrão 'pt')
    // Agora que as traduções estão carregadas e as configurações foram lidas,
    // podemos chamar setLanguage com o idioma correto e todas as dependências.
    window.soundboardApp.i18n.setLanguage(
        loadedLanguage,
        domElements,
        window.soundboardApp.soundData,
        window.soundboardApp.cellManager.updateCellDisplay,
        window.soundboardApp.utils
    );

    // 6. Configurar Event Listeners e Lógica Adicional

    // Idioma
    domElements.langButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newLang = button.dataset.lang;
            window.soundboardApp.i18n.setLanguage(
                newLang,
                domElements,
                window.soundboardApp.soundData,
                window.soundboardApp.cellManager.updateCellDisplay,
                window.soundboardApp.utils
            );
            window.soundboardApp.settingsManager.saveLanguage(newLang); // Salva a nova preferência
        });
    });

    // Volume
    domElements.volumeRange.addEventListener('input', () => {
        window.soundboardApp.audioManager.setGlobalVolume(domElements.volumeRange.value);
        window.soundboardApp.utils.updateVolumeDisplay(domElements.volumeRange, domElements.volumeDisplay);
        window.soundboardApp.settingsManager.saveSettings(
            window.soundboardApp.soundData,
            domElements.volumeRange,
            domElements.playMultipleCheckbox,
            domElements.autokillModeCheckbox,
            domElements.fadeOutRange,
            domElements.fadeInRange,
            window.soundboardApp.isHelpVisible
        );
    });

    // Fade In
    domElements.fadeInRange.addEventListener('input', () => {
        window.soundboardApp.currentFadeInDuration = parseFloat(domElements.fadeInRange.value);
        window.soundboardApp.utils.updateFadeInDisplay(domElements.fadeInRange, domElements.fadeInDisplay, window.soundboardApp.i18n.getTranslationsObject(), window.soundboardApp.i18n.getCurrentLanguage());
        window.soundboardApp.settingsManager.saveSettings(
            window.soundboardApp.soundData,
            domElements.volumeRange,
            domElements.playMultipleCheckbox,
            domElements.autokillModeCheckbox,
            domElements.fadeOutRange,
            domElements.fadeInRange,
            window.soundboardApp.isHelpVisible
        );
    });

    // Fade Out
    domElements.fadeOutRange.addEventListener('input', () => {
        window.soundboardApp.currentFadeOutDuration = parseFloat(domElements.fadeOutRange.value);
        window.soundboardApp.utils.updateFadeOutDisplay(domElements.fadeOutRange, domElements.fadeOutDisplay, window.soundboardApp.i18n.getTranslationsObject(), window.soundboardApp.i18n.getCurrentLanguage());
        window.soundboardApp.settingsManager.saveSettings(
            window.soundboardApp.soundData,
            domElements.volumeRange,
            domElements.playMultipleCheckbox,
            domElements.autokillModeCheckbox,
            domElements.fadeOutRange,
            domElements.fadeInRange,
            window.soundboardApp.isHelpVisible
        );
    });

    // Play Multiple / Autokill
    domElements.playMultipleCheckbox.addEventListener('change', () => {
        window.soundboardApp.settingsManager.saveSettings(
            window.soundboardApp.soundData,
            domElements.volumeRange,
            domElements.playMultipleCheckbox,
            domElements.autokillModeCheckbox,
            domElements.fadeOutRange,
            domElements.fadeInRange,
            window.soundboardApp.isHelpVisible
        );
    });

    domElements.autokillModeCheckbox.addEventListener('change', () => {
        window.soundboardApp.settingsManager.saveSettings(
            window.soundboardApp.soundData,
            domElements.volumeRange,
            domElements.playMultipleCheckbox,
            domElements.autokillModeCheckbox,
            domElements.fadeOutRange,
            domElements.fadeInRange,
            window.soundboardApp.isHelpVisible
        );
    });

    // Botões de Ação Geral
    document.getElementById('load-sounds-button-general').addEventListener('click', () => {
        window.soundboardApp.audioManager.loadMultipleFilesIntoCells(
            window.soundboardApp.soundData,
            window.soundboardApp.NUM_CELLS,
            window.soundboardApp.audioContext,
            window.soundboardApp.cellManager.updateCellDisplay,
            window.soundboardApp.i18n.getTranslation,
            window.soundboardApp.settingsManager.saveSettings,
            domElements.volumeRange,
            domElements.playMultipleCheckbox,
            domElements.autokillModeCheckbox,
            domElements.fadeOutRange,
            domElements.fadeInRange,
            window.soundboardApp.isHelpVisible
        );
    });

    const stopAllSoundsButton = document.getElementById('stop-all-sounds');
    const stopConfirmationPopup = document.getElementById('stop-confirmation-popup');
    const confirmStopYes = document.getElementById('confirm-stop-yes');
    const confirmStopNo = document.getElementById('confirm-stop-no');

    stopAllSoundsButton.addEventListener('click', () => {
        stopConfirmationPopup.style.display = 'flex'; // Mostrar o popup
    });

    confirmStopYes.addEventListener('click', () => {
        window.soundboardApp.audioManager.stopAllSounds(window.soundboardApp.globalActivePlayingInstances, window.soundboardApp.currentFadeOutDuration);
        stopConfirmationPopup.style.display = 'none'; // Esconder o popup
    });

    confirmStopNo.addEventListener('click', () => {
        stopConfirmationPopup.style.display = 'none'; // Esconder o popup
    });

    document.getElementById('clear-all-cells').addEventListener('click', () => {
        const confirmClear = confirm(window.soundboardApp.i18n.getTranslation('confirmClearAllCells')); // Assuming you add this translation key
        if (confirmClear) {
            window.soundboardApp.cellManager.clearAllCells(
                window.soundboardApp.soundData,
                window.soundboardApp.audioContext,
                window.soundboardApp.globalActivePlayingInstances,
                window.soundboardApp.cellManager.updateCellDisplay,
                window.soundboardApp.i18n.getTranslation,
                window.soundboardApp.settingsManager.saveSettings,
                domElements.volumeRange,
                domElements.playMultipleCheckbox,
                domElements.autokillModeCheckbox,
                domElements.fadeOutRange,
                domElements.fadeInRange,
                window.soundboardApp.isHelpVisible
            );
        }
    });


    // Toggle Help
    const helpTextContent = document.getElementById('help-text-content');
    const toggleHelpButton = document.getElementById('toggle-help-button');

    // Funções para mostrar/esconder ajuda (centralizadas)
    const toggleHelp = () => {
        window.soundboardApp.isHelpVisible = !window.soundboardApp.isHelpVisible;
        if (window.soundboardApp.isHelpVisible) {
            helpTextContent.style.display = 'block';
            toggleHelpButton.textContent = window.soundboardApp.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder');
        } else {
            helpTextContent.style.display = 'none';
            toggleHelpButton.textContent = window.soundboardApp.i18n.getTranslation('toggleHelpButton');
        }
        window.soundboardApp.settingsManager.saveSettings(
            window.soundboardApp.soundData,
            domElements.volumeRange,
            domElements.playMultipleCheckbox,
            domElements.autokillModeCheckbox,
            domElements.fadeOutRange,
            domElements.fadeInRange,
            window.soundboardApp.isHelpVisible
        );
    };

    toggleHelpButton.addEventListener('click', toggleHelp);
    // Aplicar o estado inicial da ajuda APÓS as traduções e settings estarem carregadas
    if (window.soundboardApp.isHelpVisible) {
        helpTextContent.style.display = 'block';
    } else {
        helpTextContent.style.display = 'none';
    }
    toggleHelpButton.textContent = window.soundboardApp.i18n.getTranslation('toggleHelpButton').replace('Mostrar', window.soundboardApp.isHelpVisible ? 'Esconder' : 'Mostrar');


    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Stop All Sounds (ESC)
        if (e.key === 'Escape' && stopConfirmationPopup.style.display !== 'flex') {
            e.preventDefault();
            stopConfirmationPopup.style.display = 'flex';
        }

        // Volume control (Up/Down arrows)
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            domElements.volumeRange.value = Math.min(1, parseFloat(domElements.volumeRange.value) + 0.05).toFixed(2);
            domElements.volumeRange.dispatchEvent(new Event('input')); // Trigger input event
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            domElements.volumeRange.value = Math.max(0, parseFloat(domElements.volumeRange.value) - 0.05).toFixed(2);
            domElements.volumeRange.dispatchEvent(new Event('input')); // Trigger input event
        }

        // Fade In control (Ctrl + 0-9)
        if (e.ctrlKey && e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const fadeValue = parseInt(e.key);
            domElements.fadeInRange.value = fadeValue;
            domElements.fadeInRange.dispatchEvent(new Event('input')); // Trigger input event
        }

        // Fade Out control (0-9)
        if (!e.ctrlKey && e.key >= '0' && e.key <= '9') { // Ensure Ctrl is NOT pressed
            e.preventDefault();
            const fadeValue = parseInt(e.key);
            domElements.fadeOutRange.value = fadeValue;
            domElements.fadeOutRange.dispatchEvent(new Event('input')); // Trigger input event
        }

        // QLab-like navigation (Spacebar for GO, Ctrl+Space for BACK)
        if (e.key === ' ' && !e.repeat) { // Spacebar for GO (play next available)
            e.preventDefault(); // Prevent page scroll
            window.soundboardApp.cueGoSystem.playNextAvailableSound(
                window.soundboardApp.soundData,
                window.soundboardApp.audioManager.playSound,
                window.soundboardApp.audioContext,
                domElements.playMultipleCheckbox,
                domElements.autokillModeCheckbox,
                window.soundboardApp.globalActivePlayingInstances,
                window.soundboardApp.currentFadeInDuration,
                window.soundboardApp.currentFadeOutDuration,
                domElements.volumeRange,
                window.soundboardApp.i18n.getTranslation,
                false // Not going backward
            );
        } else if (e.key === ' ' && e.ctrlKey && !e.repeat) { // Ctrl + Space for BACK (play previous available)
            e.preventDefault();
            window.soundboardApp.cueGoSystem.playNextAvailableSound(
                window.soundboardApp.soundData,
                window.soundboardApp.audioManager.playSound,
                window.soundboardApp.audioContext,
                domElements.playMultipleCheckbox,
                domElements.autokillModeCheckbox,
                window.soundboardApp.globalActivePlayingInstances,
                window.soundboardApp.currentFadeInDuration,
                window.soundboardApp.currentFadeOutDuration,
                domElements.volumeRange,
                window.soundboardApp.i18n.getTranslation,
                true // Going backward
            );
        }

        // CUE / GO (Ctrl+Enter, Enter, Shift+Enter, Alt+Enter)
        if (e.key === 'Enter' && !e.repeat) {
            e.preventDefault();
            if (e.ctrlKey) { // Ctrl + Enter: CUE selected sound (if a cell is focused or similar logic)
                // This usually cues the currently focused cell or the next in sequence if none.
                // For now, let's assume it should behave like Ctrl+Click on the current "active" sound
                // (which is the one that would be played by Space) or simply do nothing specific
                // if no active selection. A more robust implementation might involve a currently "selected" cell.
                // For a soundboard, Ctrl+Click on a cell is more intuitive for cueing.
                // If you want Ctrl+Enter to cue the NEXT sound in QLAB sequence:
                // window.soundboardApp.cueGoSystem.toggleCue(window.soundboardApp.cueGoSystem.getNextGoIndex(), true);
                // For now, we assume Ctrl+Click handles individual cueing.
            } else if (e.shiftKey) { // Shift + Enter: Stop all Cued sounds
                window.soundboardApp.cueGoSystem.stopCuedSounds(
                    window.soundboardApp.audioManager.fadeoutSound,
                    window.soundboardApp.audioManager.stopAllSounds,
                    window.soundboardApp.globalActivePlayingInstances,
                    window.soundboardApp.currentFadeOutDuration
                );
            } else if (e.altKey) { // Alt + Enter: Remove all Cued sounds without stopping
                window.soundboardApp.cueGoSystem.clearCuedSounds();
            } else { // Enter: Play all Cued sounds
                window.soundboardApp.cueGoSystem.playCuedSounds(
                    window.soundboardApp.audioManager.playSound,
                    window.soundboardApp.soundData,
                    window.soundboardApp.audioContext,
                    domElements.playMultipleCheckbox,
                    domElements.autokillModeCheckbox,
                    window.soundboardApp.globalActivePlayingInstances,
                    window.soundboardApp.currentFadeInDuration,
                    domElements.volumeRange
                );
            }
        }

        // Keyboard shortcuts for cells (QWERTY layout)
        const pressedKey = e.key.toLowerCase();
        const cellIndex = window.soundboardApp.defaultKeys.indexOf(pressedKey);

        if (cellIndex !== -1 && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) { // Avoid interference with other shortcuts
            e.preventDefault(); // Prevent default browser action (e.g., if key is part of form)
            const sound = window.soundboardApp.soundData[cellIndex];
            if (sound && sound.audioBuffer) { // Check if sound is loaded
                window.soundboardApp.audioManager.playSound(
                    cellIndex,
                    window.soundboardApp.soundData,
                    window.soundboardApp.audioContext,
                    domElements.playMultipleCheckbox,
                    domElements.autokillModeCheckbox,
                    window.soundboardApp.globalActivePlayingInstances,
                    window.soundboardApp.currentFadeInDuration,
                    window.soundboardApp.currentFadeOutDuration,
                    domElements.volumeRange
                );
            }
        }
    });

    // Initial setup of the help text visibility (redundant, handled by toggleHelp function now)
    // if (window.soundboardApp.isHelpVisible) {
    //     helpTextContent.style.display = 'block';
    // } else {
    //     helpTextContent.style.display = 'none';
    // }
});
