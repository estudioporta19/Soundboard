// settingsManager.js
// Gerencia o carregamento e salvamento de configurações e dados de som.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.settingsManager = (function() {

    /**
     * Carrega as configurações da aplicação, incluindo dados de som persistidos.
     * @param {object} appState - O objeto global window.soundboardApp contendo o estado da aplicação.
     * @param {function} loadMultipleFilesIntoCellsCallback - Callback para carregar múltiplos arquivos (usado para o botão geral de load).
     */
    async function loadSettings(appState, loadMultipleFilesIntoCellsCallback) { // <--- ALTERAÇÃO AQUI: Adicionado 'async'
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        const savedHelpVisible = savedSettings.helpVisible !== undefined ? savedSettings.helpVisible : true;

        // Atualiza as configurações gerais da UI
        updateGeneralSettingsUI(appState, savedSettings, savedHelpVisible);

        // Inicializa o array soundData com nulls para todas as células
        appState.soundData = Array(appState.NUM_CELLS).fill(null);

        // Primeiro, crie as células vazias para ter os elementos DOM disponíveis
        // e configure o array soundData com placeholders se houver dados salvos.
        for (let i = 0; i < appState.NUM_CELLS; i++) {
            const cellData = savedSounds[i];
            const cellElement = window.soundboardApp.cellManager.createSoundCell(
                i,
                appState.defaultKeys[i],
                appState.soundData, // Passa a referência para soundData
                window.soundboardApp.audioManager.playSound,
                window.soundboardApp.audioManager.loadFileIntoCell,
                window.soundboardApp.audioManager.clearSoundCell,
                window.soundboardApp.audioManager.fadeoutSound,
                window.soundboardApp.cueGoSystem.toggleCue,
                window.soundboardApp.i18n.getTranslation,
                loadMultipleFilesIntoCellsCallback
            );

            // Adiciona a célula ao array sb.soundCells do appState (se não for feito já em cellManager.createSoundCell)
            // Certifique-se que o cellManager já preenche appState.soundCells ou faça isso aqui
            // appState.soundCells[i] = cellElement; // Isso deve ser handled pelo cellManager, mas verificar.

            if (cellData && cellData.soundFileId) { // <--- ALTERAÇÃO CHAVE: Verificar soundFileId
                // Se houver soundFileId, prepare a entrada no soundData para carregamento posterior
                // O audioBuffer será carregado sob demanda pelo audioManager.playSound ou explicitamente por loadSoundFromIndexedDB
                appState.soundData[i] = {
                    name: cellData.name || window.soundboardApp.i18n.getTranslation('soundNameDefault'),
                    key: cellData.key || appState.defaultKeys[i],
                    soundFileId: cellData.soundFileId, // Salva o ID do arquivo do IndexedDB
                    _audioBufferCache: null, // Inicialmente null, será preenchido pelo audioManager
                    activePlayingInstances: new Set(),
                    color: cellData.color || window.soundboardApp.utils.getRandomHSLColor(),
                    isLooping: cellData.isLooping !== undefined ? cellData.isLooping : false,
                    isCued: cellData.isCued !== undefined ? cellData.isCued : false
                };
            } else {
                // Se não há soundFileId, a célula está vazia
                appState.soundData[i] = null;
            }
            // Atualiza a exibição da célula (seja vazia ou com nome/cor do som)
            // loadSoundFromIndexedDB vai chamar updateCellDisplay novamente quando o som for decodificado.
            window.soundboardApp.cellManager.updateCellDisplay(
                cellElement,
                appState.soundData[i] || { name: window.soundboardApp.i18n.getTranslation('cellEmptyDefault'), key: appState.defaultKeys[i] },
                true, // Indica que é uma inicialização ou carregamento
                window.soundboardApp.i18n.getTranslation
            );
        }

        // Após criar as células e preencher soundData com referências,
        // carrega os audioBuffers para as células que têm soundFileId.
        // Isso é feito em background para não bloquear a UI.
        for (let i = 0; i < appState.NUM_CELLS; i++) {
            const cellData = appState.soundData[i]; // Pegar do appState.soundData que foi populado
            if (cellData && cellData.soundFileId) {
                const cellElement = document.querySelector(`.sound-cell[data-index="${i}"]`);
                try {
                    // loadSoundFromIndexedDB decodifica e preenche _audioBufferCache
                    await window.soundboardApp.audioManager.loadSoundFromIndexedDB(
                        cellData.soundFileId,
                        cellElement, // Passa o elemento da célula para updateCellDisplay
                        i,
                        appState.soundData, // Passa appState.soundData para o AudioManager
                        appState.audioContext,
                        window.soundboardApp.cellManager.updateCellDisplay,
                        window.soundboardApp.i18n.getTranslation
                    );
                } catch (error) {
                    console.error(`Erro ao carregar som ${cellData.name} (ID: ${cellData.soundFileId}) do IndexedDB:`, error);
                    // Opcional: Limpar a célula se o carregamento falhar
                    window.soundboardApp.audioManager.clearSoundCell(i, appState.soundData, appState.audioContext, appState.globalActivePlayingInstances, window.soundboardApp.cellManager.updateCellDisplay, window.soundboardApp.i18n.getTranslation, saveSettings);
                }
            }
        }
    }

    /**
     * Salva as configurações atuais da aplicação no localStorage.
     * @param {Array<object|null>} soundData - Array de objetos de som (contendo name, key, color, isLooping, isCued, soundFileId).
     * @param {HTMLInputElement} volumeRange - Elemento HTML do slider de volume.
     * @param {HTMLInputElement} playMultipleCheckbox - Elemento HTML da checkbox "Play Multiple".
     * @param {HTMLInputElement} autokillModeCheckbox - Elemento HTML da checkbox "Autokill Mode".
     * @param {HTMLInputElement} fadeOutRange - Elemento HTML do slider de Fade Out.
     * @param {HTMLInputElement} fadeInRange - Elemento HTML do slider de Fade In.
     * @param {boolean} isHelpVisible - Estado de visibilidade da ajuda.
     */
    function saveSettings(soundData, volumeRange, playMultipleCheckbox, autokillModeCheckbox, fadeOutRange, fadeInRange, isHelpVisible) {
        const settingsToSave = {
            volume: parseFloat(volumeRange.value),
            playMultiple: playMultipleCheckbox.checked,
            autokillMode: autokillModeCheckbox.checked,
            currentFadeOutDuration: parseFloat(fadeOutRange.value),
            currentFadeInDuration: parseFloat(fadeInRange.value),
            helpVisible: isHelpVisible,
            // Apenas salve metadados e soundFileId, não o audioBuffer.
            sounds: soundData.map(data => ({
                name: data ? data.name : null,
                key: data ? data.key : null,
                soundFileId: data ? data.soundFileId : null, // <--- ALTERAÇÃO CHAVE: Salvar soundFileId
                color: data ? data.color : null,
                isLooping: data ? data.isLooping : false,
                isCued: data ? data.isCued : false
            }))
        };
        localStorage.setItem('soundboardSettings', JSON.stringify(settingsToSave));
    }

    /**
     * Atualiza os elementos da UI com base nas configurações gerais carregadas.
     * Esta função pode ser chamada separadamente após o carregamento inicial ou de uma sessão.
     * @param {object} appState - O objeto global window.soundboardApp.
     * @param {object} loadedSettings - Objeto com as configurações gerais (volume, playMultiple, etc.).
     * @param {boolean} helpVisibility - O estado de visibilidade da ajuda.
     */
    function updateGeneralSettingsUI(appState, loadedSettings, helpVisibility) {
        appState.volumeRange.value = loadedSettings.volume !== undefined ? loadedSettings.volume : 0.75;
        appState.playMultipleCheckbox.checked = loadedSettings.playMultiple !== undefined ? loadedSettings.playMultiple : false;
        appState.autokillModeCheckbox.checked = loadedSettings.autokillMode !== undefined ? loadedSettings.autokillMode : false;
        appState.fadeInRange.value = loadedSettings.currentFadeInDuration !== undefined ? loadedSettings.currentFadeInDuration : 0;
        appState.fadeOutRange.value = loadedSettings.currentFadeOutDuration !== undefined ? loadedSettings.currentFadeOutDuration : 0;
        appState.currentFadeInDuration = parseFloat(appState.fadeInRange.value);
        appState.currentFadeOutDuration = parseFloat(appState.fadeOutRange.value);
        appState.isHelpVisible = helpVisibility;

        window.soundboardApp.utils.updateVolumeDisplay(appState.volumeRange, appState.volumeDisplay);
        // Os displays de fade serão atualizados por i18n.setLanguage após as traduções serem carregadas

        const helpTextContent = document.getElementById('help-text-content');
        const toggleHelpButton = document.getElementById('toggle-help-button');
        if (helpTextContent && toggleHelpButton) {
            if (appState.isHelpVisible) {
                // A classe 'visible' é adicionada/removida no main.js, este é apenas o texto
                toggleHelpButton.textContent = window.soundboardApp.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder');
            } else {
                toggleHelpButton.textContent = window.soundboardApp.i18n.getTranslation('toggleHelpButton');
            }
        }

        // Aplica o volume master imediatamente
        if (appState.audioContext && appState.masterGainNode) {
            appState.masterGainNode.gain.value = appState.volumeRange.value;
        }
    }


    return {
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        updateGeneralSettingsUI: updateGeneralSettingsUI // <--- NOVO: Exporta a função para uso externo
    };
})();
