// main.js
// Configuração inicial, variáveis globais e ouvintes de eventos globais.
// Orquestra a interação entre os outros módulos.

document.addEventListener('DOMContentLoaded', () => {
    // 1. Variáveis Globais e Elementos do DOM
    // Torna-os acessíveis globalmente através do objeto window.soundboardApp
    window.soundboardApp = window.soundboardApp || {};

    const sb = window.soundboardApp; // Alias for convenience

    // Elementos principais do DOM
    sb.soundboardGrid = document.querySelector('.soundboard-grid');
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
    sb.soundCells = document.querySelectorAll('.sound-cell'); // Será populado pelo cellManager inicialmente

    // Novos elementos DOM relacionados ao popup de confirmação (agora não mais usados para parar sons)
    sb.clearAllCellsBtn = document.getElementById('clear-all-cells');
    sb.toggleHelpButton = document.getElementById('toggle-help-button');
    sb.helpTextContent = document.getElementById('help-text-content');
    sb.stopConfirmationPopup = document.getElementById('stop-confirmation-popup');
    sb.confirmStopYesBtn = document.getElementById('confirm-stop-yes');
    sb.confirmStopNoBtn = document.getElementById('confirm-stop-no');


    // Estado da Aplicação
    sb.audioContext = null; // Inicializado por audioManager.initAudioContext
    sb.masterGainNode = null; // Definido por audioManager.initAudioContext
    sb.soundData = []; // { name, key, audioBuffer, audioDataUrl, activePlayingInstances: Set<{source: AudioBufferSourceNode, gain: GainNode}>, color, isLooping, isCued }
    sb.globalActivePlayingInstances = new Set(); // Rastreia todas as instâncias de som atualmente a tocar
    sb.currentFadeOutDuration = 0;
    sb.currentFadeInDuration = 0;
    sb.isHelpVisible = true; // Estado padrão para visibilidade do texto de ajuda


    sb.defaultKeys = [
        'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
        'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
        'z', 'x', 'c', 'v', 'b', 'n', 'm'
    ];
    sb.NUM_CELLS = sb.defaultKeys.length;


    // 2. Carregar Traduções e Configurações Iniciais
    sb.i18n.loadTranslations((lang) => {
        sb.currentLanguage = lang; // Define a língua global atual
        // Passa o callback loadMultipleFilesIntoCells para loadSettings
        sb.settingsManager.loadSettings(sb, sb.audioManager.loadMultipleFilesIntoCells);

        // Re-consulta as células de som, pois são criadas dinamicamente por loadSettings
        sb.soundCells = document.querySelectorAll('.sound-cell');

        // Reaplica textos específicos da língua após as configurações serem carregadas e as células criadas/atualizadas
        sb.i18n.setLanguage(
            sb.currentLanguage,
            {
                titleElement: sb.titleElement,
                allDataKeyElements: sb.allDataKeyElements,
                fadeOutRange: sb.fadeOutRange,
                fadeOutDisplay: sb.fadeOutDisplay,
                fadeInRange: sb.fadeInRange,
                fadeInDisplay: sb.fadeInDisplay,
                soundCells: sb.soundCells, // Usa a lista re-consultada
                langButtons: sb.langButtons
            },
            sb.soundData,
            sb.cellManager.updateCellDisplay,
            sb.utils
        );

        // Após todas as células serem criadas e potencialmente carregadas, atualiza os cues a partir das configurações salvas
        const savedSettings = JSON.parse(localStorage.getItem('soundboardSettings')) || {};
        const savedSounds = savedSettings.sounds || [];
        const cuedIndicesFromSave = savedSounds.filter(s => s && s.isCued).map((s, idx) => idx);
        sb.cueGoSystem.setCuedSounds(cuedIndicesFromSave, sb.soundData); // Define o estado "cued" com base nos dados salvos

        // AJUSTE PARA O TEXTO DE AJUDA: Usa classes CSS para visibilidade inicial
        if (sb.isHelpVisible) {
            sb.helpTextContent.classList.add('visible'); // Adiciona a classe 'visible'
            sb.toggleHelpButton.textContent = sb.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder');
        } else {
            sb.helpTextContent.classList.remove('visible'); // Remove a classe 'visible'
            sb.toggleHelpButton.textContent = sb.i18n.getTranslation('toggleHelpButton');
        }

    });


    // 3. Ouvintes de Eventos Globais

    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        const pressedKey = e.key.toLowerCase();

        // Previne ações padrão para elementos editáveis
        if (e.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            return;
        }

        // Lógica para Espaço e Ctrl + Espaço (navegação estilo QLab)
        if (pressedKey === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) { // Apenas Espaço (GO)
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
                // Se nenhum som for encontrado após o último tocado, volta para o primeiro, se houver
                const firstSound = sb.cueGoSystem.findNextSoundIndex(-1, 1, sb.soundData, sb.NUM_CELLS);
                if (firstSound !== null) {
                    sb.audioManager.playSound(firstSound, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
                } else {
                    console.log(sb.i18n.getTranslation("noMoreSoundsForward"));
                }
            }
            return;
        } else if (pressedKey === ' ' && e.ctrlKey) { // Ctrl + Espaço (GO-)
            e.preventDefault();
            let targetIndex;
            const lastPlayed = sb.audioManager.getLastPlayedSoundIndex();

            if (lastPlayed === null) { // Se nada tocou, começa do fim e vai para trás
                targetIndex = sb.cueGoSystem.findNextSoundIndex(sb.NUM_CELLS, -1, sb.soundData, sb.NUM_CELLS);
            } else {
                targetIndex = sb.cueGoSystem.findNextSoundIndex(lastPlayed, -1, sb.soundData, sb.NUM_CELLS);
            }

            if (targetIndex !== null) {
                sb.audioManager.playSound(targetIndex, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
            } else {
                // Se nenhum som for encontrado antes do último tocado, volta para o último, se houver
                const lastSound = sb.cueGoSystem.findNextSoundIndex(sb.NUM_CELLS, -1, sb.soundData, sb.NUM_CELLS);
                if (lastSound !== null) {
                    sb.audioManager.playSound(lastSound, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
                } else {
                    console.log(sb.i18n.getTranslation("noMoreSoundsBackward"));
                }
            }
            return;
        }

        // Atalhos de teclado para Cue/Go
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.ctrlKey) { // Ctrl + Enter: Ativa/desativa cue para o último som tocado
                const lastPlayed = sb.audioManager.getLastPlayedSoundIndex();
                if (lastPlayed !== null && sb.soundData[lastPlayed]) {
                    sb.cueGoSystem.toggleCue(lastPlayed, sb.soundData, sb.cueGoSystem.getCuedSounds());
                }
            } else if (e.shiftKey) { // Shift + Enter: Para todos os sons em cue
                sb.cueGoSystem.stopCuedSounds(sb.soundData, sb.audioContext, sb.audioManager.fadeoutSound, sb.globalActivePlayingInstances);
            } else if (e.altKey) { // Alt + Enter: Remove todos os cues sem parar
                sb.cueGoSystem.removeAllCues(sb.soundData);
            } else { // Enter (sem modificadores): Toca todos os sons em cue
                sb.cueGoSystem.playCuedSounds(sb.soundData, sb.audioContext, sb.audioManager.playSound, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
            }
            return;
        }

        // Controlo de volume com teclas de seta
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
            e.preventDefault(); // Previne o comportamento padrão (ex: sair do fullscreen)
            // CHAMA DIRETAMENTE A FUNÇÃO PARA PARAR TODOS OS SONS sem fade
            sb.audioManager.stopAllSounds(sb.audioContext, sb.globalActivePlayingInstances, sb.soundData); // Chamada sem duração de fade
            console.log("ESC pressionado: Todos os sons parados diretamente."); // Mensagem de depuração
        } else if (pressedKey === 'backspace') { // <--- NOVO: Fade out de todos os sons com Backspace
            e.preventDefault(); // Previne o comportamento padrão do Backspace (ex: navegar para trás no histórico)
            // Chama a função para parar todos os sons, passando a duração de fade out atual
            sb.audioManager.stopAllSounds(sb.audioContext, sb.globalActivePlayingInstances, sb.soundData, sb.currentFadeOutDuration);
            console.log("Backspace pressionado: Todos os sons a fazer fade out.");
        }
        else if (e.ctrlKey && pressedKey >= '0' && pressedKey <= '9') { // Ctrl + 0-9 para Fade In
            e.preventDefault();
            sb.fadeInRange.value = parseInt(pressedKey);
            sb.currentFadeInDuration = parseFloat(sb.fadeInRange.value);
            sb.utils.updateFadeInDisplay(sb.fadeInRange, sb.fadeInDisplay, sb.i18n.getTranslationsObject(), sb.i18n.getCurrentLanguage());
            sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
        } else if (pressedKey >= '0' && pressedKey <= '9' && !e.ctrlKey && !e.altKey && !e.shiftKey) { // 0-9 para Fade Out
            e.preventDefault();
            sb.fadeOutRange.value = parseInt(pressedKey);
            sb.currentFadeOutDuration = parseFloat(sb.fadeOutRange.value);
            sb.utils.updateFadeOutDisplay(sb.fadeOutRange, sb.fadeOutDisplay, sb.i18n.getTranslationsObject(), sb.i18n.getCurrentLanguage());
            sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
        } else {
            // Toca o som pela tecla QWERTY
            const indexToPlay = sb.defaultKeys.indexOf(pressedKey);
            if (indexToPlay !== -1 && sb.soundData[indexToPlay] && sb.soundData[indexToPlay].audioBuffer) {
                sb.audioManager.playSound(indexToPlay, sb.soundData, sb.audioContext, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.globalActivePlayingInstances, sb.currentFadeInDuration, sb.currentFadeOutDuration, sb.volumeRange);
            }
        }
    });

    // Ouvintes do painel de controlo
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

    // Botão Parar Todos os Sons (AGORA SEM CONFIRMAÇÃO DO POPUP)
    sb.stopAllSoundsBtn.addEventListener('click', () => {
        // CHAMA DIRETAMENTE A FUNÇÃO PARA PARAR TODOS OS SONS (sem fade)
        sb.audioManager.stopAllSounds(sb.audioContext, sb.globalActivePlayingInstances, sb.soundData);
        console.log("Botão 'Parar Todos os Sons' clicado: Todos os sons parados diretamente."); // Mensagem de depuração
    });

    // Os listeners e a exibição do popup de confirmação não são mais necessários para a funcionalidade de parar sons.
    // Pode remover o elemento popup do seu HTML se não for usado para mais nada.
    // sb.confirmStopYesBtn.addEventListener('click', () => { ... });
    // sb.confirmStopNoBtn.addEventListener('click', () => { ... });
    // Para garantir que o popup não aparece, pode adicionar ao seu CSS: #stop-confirmation-popup { display: none !important; }

    // Botão Carregar Múltiplos Sons
    sb.loadSoundsButtonGeneral.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        // FIX: Alterado 'audio/mp3' para 'audio/mpeg' para compatibilidade adequada
        input.accept = 'audio/mpeg, audio/wav, audio/ogg';
        input.multiple = true;

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);

            // --- INÍCIO: Adições para Depuração e Validação de Ficheiros ---
            console.log("Ficheiros selecionados:", files); // Veja todos os ficheiros
            files.forEach(file => {
                console.log(`Nome do Ficheiro: ${file.name}, Tipo MIME detetado pelo navegador: ${file.type}`);
            });
            // --- FIM: Adições para Depuração e Validação de Ficheiros ---
            
            // Adiciona uma validação mais robusta do lado do cliente usando a propriedade file.type
            const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
            const validFiles = files.filter(file => allowedMimeTypes.includes(file.type));
            const invalidFiles = files.filter(file => !allowedMimeTypes.includes(file.type));

            if (invalidFiles.length > 0) {
                const invalidNames = invalidFiles.map(f => f.name).join(', ');
                // Temporariamente desativamos o alert para vermos os logs na consola
                // alert(sb.i18n.getTranslation('alertInvalidFileType').replace('{fileNames}', invalidNames));
                console.warn(`Ficheiros inválidos detectados: ${invalidNames}. Tipos MIME esperados: ${allowedMimeTypes.join(', ')}`);
                // Se não houver ficheiros válidos, pára o processo
                if (validFiles.length === 0) {
                    return;
                }
            }

            // Encontra o índice da primeira célula vazia disponível para começar a carregar
            let startIndex = sb.soundData.findIndex(s => s === null || (s && s.audioBuffer === null));
            if (startIndex === -1) { // Se não encontrar nenhuma célula vazia, começa do 0
                startIndex = 0;
            }

            // Chama a nova função do audioManager para lidar com o carregamento de múltiplos ficheiros
            await sb.audioManager.loadMultipleFilesIntoCells(
                validFiles, // Passa apenas os ficheiros válidos para o carregamento
                startIndex,
                sb.soundData,
                sb.audioContext,
                sb.cellManager.updateCellDisplay,
                sb.i18n.getTranslation,
                sb.settingsManager.saveSettings
            );
        };
        input.click();
    });

    // Botão Limpar Todas as Células
    sb.clearAllCellsBtn.addEventListener('click', () => {
        sb.audioManager.clearAllSoundCells(sb.soundData, sb.audioContext, sb.globalActivePlayingInstances, sb.NUM_CELLS, sb.cellManager.updateCellDisplay, sb.i18n.getTranslation, sb.settingsManager.saveSettings);
    });

    // Botões de Idioma
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
                    soundCells: document.querySelectorAll('.sound-cell'), // Re-consulta após mudança de idioma se as células foram atualizadas
                    langButtons: sb.langButtons
                },
                sb.soundData,
                sb.cellManager.updateCellDisplay,
                sb.utils
            );
        });
    });

    // Toggle Help Button - AJUSTADO PARA USAR CLASSES CSS
    sb.toggleHelpButton.addEventListener('click', () => {
        sb.isHelpVisible = !sb.isHelpVisible;
        if (sb.isHelpVisible) {
            sb.helpTextContent.classList.add('visible'); // Adiciona a classe 'visible'
            sb.toggleHelpButton.textContent = sb.i18n.getTranslation('toggleHelpButton').replace('Mostrar', 'Esconder');
        } else {
            sb.helpTextContent.classList.remove('visible'); // Remove a classe 'visible'
            sb.toggleHelpButton.textContent = sb.i18n.getTranslation('toggleHelpButton');
        }
        sb.settingsManager.saveSettings(sb.soundData, sb.volumeRange, sb.playMultipleCheckbox, sb.autokillModeCheckbox, sb.fadeOutRange, sb.fadeInRange, sb.isHelpVisible);
    });

    // Retomar AudioContext na primeira interação do utilizador
    document.body.addEventListener('click', () => {
        if (sb.audioContext && sb.audioContext.state === 'suspended') {
            sb.audioContext.resume().then(() => {
                console.log('AudioContext resumed due to user interaction.');
            });
        }
    }, { once: true });
});
