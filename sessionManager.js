// sessionManager.js
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.sessionManager = (function() {
    const SESSIONS_STORAGE_KEY = 'soundboard_sessions';
    let currentSessionId = null;

    // Dependências de outras partes da aplicação
    let sb; // soundboardApp principal

    function setSoundboardApp(appInstance) {
        sb = appInstance;
    }

    /**
     * Gera um ID único simples para a sessão.
     * @returns {string} Um ID de sessão único.
     */
    function generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Salva a sessão atual no localStorage.
     * @param {Array} soundData - O array de dados de som global.
     * @param {HTMLInputElement} volumeRange - Elemento HTML do slider de volume.
     * @param {HTMLInputElement} playMultipleCheckbox - Checkbox para tocar múltiplos sons.
     * @param {HTMLInputElement} autokillModeCheckbox - Checkbox para o modo autokill.
     * @param {HTMLInputElement} fadeOutRange - Slider de fade out.
     * @param {HTMLInputElement} fadeInRange - Slider de fade in.
     * @param {boolean} isHelpVisible - Estado da ajuda visível.
     * @param {Function} getTranslation - Função para obter traduções.
     */
    function saveCurrentSession(soundData, volumeRange, playMultipleCheckbox, autokillModeCheckbox, fadeOutRange, fadeInRange, isHelpVisible, getTranslation) {
        // Interrompe qualquer autokill em progresso para não salvar estado intermediário
        if (sb.autokillTimeout) {
            clearTimeout(sb.autokillTimeout);
            sb.autokillTimeout = null;
        }

        let sessionName = prompt(getTranslation('promptSaveSessionName'), currentSessionId || getTranslation('defaultSessionName'));
        if (sessionName === null || sessionName.trim() === '') {
            alert(getTranslation('alertSessionNameRequired'));
            return;
        }

        const sessionId = currentSessionId || generateSessionId();

        // Mapeia soundData para uma versão serializável, incluindo APENAS o soundFileId
        const soundsToSave = soundData.map(s => {
            if (s && s.soundFileId) { // Verifica se a célula tem um som carregado com ID
                return {
                    name: s.name,
                    key: s.key,
                    soundFileId: s.soundFileId, // Apenas o ID do ficheiro no IndexedDB
                    color: s.color,
                    isLooping: s.isLooping,
                    isCued: s.isCued
                };
            }
            return null; // Representa uma célula vazia
        });

        const sessionToSave = {
            id: sessionId,
            name: sessionName,
            timestamp: Date.now(),
            settings: {
                volume: volumeRange.value,
                playMultiple: playMultipleCheckbox.checked,
                autokillMode: autokillModeCheckbox.checked,
                fadeOut: fadeOutRange.value,
                fadeIn: fadeInRange.value,
                isHelpVisible: isHelpVisible,
            },
            sounds: soundsToSave // Agora contém apenas referências ID e metadados leves
        };

        let allSessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');
        const existingSessionIndex = allSessions.findIndex(s => s.id === sessionId);

        if (existingSessionIndex > -1) {
            allSessions[existingSessionIndex] = sessionToSave;
        } else {
            allSessions.push(sessionToSave);
        }

        try {
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(allSessions));
            currentSessionId = sessionId; // Define a sessão atual como a salva
            alert(getTranslation('alertSessionSaved').replace('{sessionName}', sessionName));
            updateSessionListUI(); // Atualiza a lista de sessões no UI
            console.log(`Sessão "${sessionName}" salva com sucesso. ID: ${sessionId}`);
            console.log("Tamanho do localStorage após salvar:", (JSON.stringify(allSessions).length / 1024).toFixed(2), "KB");
        } catch (e) {
            console.error("Erro ao salvar sessão no localStorage:", e);
            alert(getTranslation('alertSaveError').replace('{error}', e.message));
        }
    }

    /**
     * Carrega uma sessão do localStorage e restaura o estado da soundboard.
     * @param {string} sessionId - O ID da sessão a carregar.
     * @param {Array} soundData - O array de dados de som global.
     * @param {HTMLInputElement} volumeRange - Elemento HTML do slider de volume.
     * @param {HTMLInputElement} playMultipleCheckbox - Checkbox para tocar múltiplos sons.
     * @param {HTMLInputElement} autokillModeCheckbox - Checkbox para o modo autokill.
     * @param {HTMLInputElement} fadeOutRange - Slider de fade out.
     * @param {HTMLInputElement} fadeInRange - Slider de fade in.
     * @param {Function} updateCellDisplay - Callback para atualizar o display da célula.
     * @param {Function} getTranslation - Função para obter traduções.
     * @param {Function} saveSettingsCallback - Callback para salvar as configurações (usado para cada célula).
     * @param {Function} updateGeneralSettingsUI - Callback para atualizar a UI de configurações gerais.
     */
    async function loadSelectedSession(sessionId, soundData, volumeRange, playMultipleCheckbox, autokillModeCheckbox, fadeOutRange, fadeInRange, updateCellDisplay, getTranslation, saveSettingsCallback, updateGeneralSettingsUI) {
        if (!confirm(getTranslation('confirmLoadSession'))) {
            return;
        }

        stopAllSounds(sb.audioContext, sb.globalActivePlayingInstances, sb.soundData, 0.2); // Parar todos os sons antes de carregar nova sessão
        sb.cueGoSystem.removeAllCues(soundData); // Limpa todos os cues ao carregar nova sessão

        const allSessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');
        const loadedSession = allSessions.find(s => s.id === sessionId);

        if (!loadedSession) {
            alert(getTranslation('alertSessionNotFound'));
            return;
        }

        console.log(`Carregando sessão: "${loadedSession.name}" (ID: ${loadedSession.id})`);

        // Atualizar configurações gerais
        volumeRange.value = loadedSession.settings.volume;
        playMultipleCheckbox.checked = loadedSession.settings.playMultiple;
        autokillModeCheckbox.checked = loadedSession.settings.autokillMode;
        fadeOutRange.value = loadedSession.settings.fadeOut;
        fadeInRange.value = loadedSession.settings.fadeIn;
        // isHelpVisible é um caso especial, pode ser atualizado separadamente ou passado aqui
        if (updateGeneralSettingsUI) {
            updateGeneralSettingsUI(loadedSession.settings);
        }

        // Limpar todas as células visualmente e logicamente antes de carregar as novas
        // Cuidado: não chame clearAllSoundCells aqui para evitar exclusão de IndexedDB antes da carga
        for (let i = 0; i < sb.NUM_CELLS; i++) {
            sb.audioManager.clearSoundData(i, sb.soundData, sb.audioContext, sb.globalActivePlayingInstances);
            const cellElement = document.querySelector(`.sound-cell[data-index="${i}"]`);
            if (cellElement) {
                updateCellDisplay(cellElement, { name: getTranslation('cellEmptyDefault'), key: sb.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
            }
        }


        // Carregar sons na soundData e atualizar o display das células
        for (let i = 0; i < loadedSession.sounds.length; i++) {
            const savedSound = loadedSession.sounds[i];
            const cellElement = document.querySelector(`.sound-cell[data-index="${i}"]`);

            if (savedSound && savedSound.soundFileId) {
                // Chama a nova função loadSoundFromIndexedDB
                await sb.audioManager.loadSoundFromIndexedDB(
                    savedSound.soundFileId,
                    cellElement,
                    i,
                    savedSound.name,
                    savedSound.key,
                    savedSound.color,
                    savedSound.isLooping,
                    savedSound.isCued,
                    sb.soundData,
                    sb.audioContext,
                    updateCellDisplay,
                    getTranslation,
                    saveSettingsCallback // Passa o saveSettingsCallback (embora não deva ser usado dentro de loadSoundFromIndexedDB para cada célula)
                );
            } else {
                // Garante que células vazias são representadas corretamente
                sb.audioManager.clearSoundData(i, sb.soundData, sb.audioContext, sb.globalActivePlayingInstances);
                if (cellElement) {
                    updateCellDisplay(cellElement, { name: getTranslation('cellEmptyDefault'), key: sb.defaultKeys[i] || '', isLooping: false, isCued: false }, true, getTranslation);
                }
            }
        }
        currentSessionId = sessionId; // Atualiza a sessão atual
        alert(getTranslation('alertSessionLoaded').replace('{sessionName}', loadedSession.name));
        console.log(`Sessão "${loadedSession.name}" carregada com sucesso.`);
    }

    /**
     * Remove uma sessão do localStorage e do IndexedDB.
     * @param {string} sessionId - O ID da sessão a remover.
     * @param {Function} getTranslation - Função para obter traduções.
     * @param {Array} soundData - O array global de dados de som.
     */
    async function deleteSession(sessionId, getTranslation, soundData) {
        if (!confirm(getTranslation('confirmDeleteSession'))) {
            return;
        }

        let allSessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');
        const sessionToDelete = allSessions.find(s => s.id === sessionId);

        if (!sessionToDelete) {
            alert(getTranslation('alertSessionNotFound'));
            return;
        }

        // Antes de remover a sessão, vamos remover os ficheiros de áudio associados do IndexedDB
        if (sessionToDelete.sounds) {
            for (const sound of sessionToDelete.sounds) {
                if (sound && sound.soundFileId) {
                    try {
                        await window.soundboardApp.dbManager.deleteSoundFile(sound.soundFileId);
                        console.log(`Ficheiro de áudio ${sound.soundFileId} removido do IndexedDB.`);
                    } catch (error) {
                        console.error(`Erro ao remover ficheiro ${sound.soundFileId} do IndexedDB:`, error);
                        // Continua mesmo com erro para tentar remover a sessão do localStorage
                    }
                }
            }
        }

        allSessions = allSessions.filter(s => s.id !== sessionId);

        try {
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(allSessions));
            alert(getTranslation('alertSessionDeleted').replace('{sessionName}', sessionToDelete.name));
            updateSessionListUI(); // Atualiza a lista de sessões no UI

            // Se a sessão deletada for a sessão atualmente ativa, limpa a soundboard
            if (currentSessionId === sessionId) {
                // Chame clearAllSoundCells para limpar o UI e o estado da soundData
                // Mas, o IndexedDB já foi limpo acima para os sons desta sessão.
                // Ajuste clearAllSoundCells para não tentar apagar do IDB novamente se já foi apagado.
                // Por simplicidade, faremos clearAllSoundCells parar os sons e limpar UI/soundData.
                // A limpeza do IDB já foi feita especificamente para esta sessão.
                await sb.audioManager.clearAllSoundCells(
                    sb.soundData, sb.audioContext, sb.globalActivePlayingInstances,
                    sb.NUM_CELLS, sb.cellManager.updateCellDisplay, sb.i18n.getTranslation, sb.settingsManager.saveSettings
                );
                currentSessionId = null; // Resetar a sessão atual
            }
        } catch (e) {
            console.error("Erro ao deletar sessão do localStorage:", e);
            alert(getTranslation('alertDeleteError').replace('{error}', e.message));
        }
    }

    /**
     * Obtém todas as sessões salvas do localStorage.
     * @returns {Array} Um array de objetos de sessão.
     */
    function getSavedSessions() {
        return JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');
    }

    /**
     * Obtém o ID da sessão atualmente ativa.
     * @returns {string|null} O ID da sessão atual ou null se nenhuma sessão estiver ativa.
     */
    function getCurrentSessionId() {
        return currentSessionId;
    }

    /**
     * Define o ID da sessão atualmente ativa.
     * Usado para inicialização ou quando uma nova sessão é carregada/criada.
     * @param {string|null} id - O ID da sessão a definir.
     */
    function setCurrentSessionId(id) {
        currentSessionId = id;
    }

    // Função placeholder para atualizar a UI da lista de sessões
    // Esta função precisará ser injetada ou implementada no seu script principal (main.js ou ui.js)
    function updateSessionListUI() {
        if (sb && sb.uiManager && typeof sb.uiManager.populateSessionDropdown === 'function') {
            sb.uiManager.populateSessionDropdown();
        } else {
            console.warn("Função updateSessionListUI (populateSessionDropdown) não disponível.");
        }
    }


    return {
        setSoundboardApp: setSoundboardApp,
        saveCurrentSession: saveCurrentSession,
        loadSelectedSession: loadSelectedSession,
        deleteSession: deleteSession,
        getSavedSessions: getSavedSessions,
        getCurrentSessionId: getCurrentSessionId,
        setCurrentSessionId: setCurrentSessionId,
        updateSessionListUI: updateSessionListUI // Exporta para ser chamado externamente
    };
})();
