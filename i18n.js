// i18n.js
// Gerencia a internacionalização (idioma) da aplicação.

// Garante que o objeto global soundboardApp existe
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.i18n = (function() {
    let translations = {};
    let currentLanguage = 'pt'; // Default language, will be overwritten by saved preference

    async function loadTranslations(setLanguageCallback) {
        try {
            const response = await fetch('translations.json');
            translations = await response.json();
            console.log('Traduções carregadas:', translations);
            const savedLang = localStorage.getItem('soundboardLanguage') || 'pt';
            setLanguageCallback(savedLang); // Call the main setLanguage function
        } catch (error) {
            console.error('Erro ao carregar traduções:', error);
            // Fallback translations if file fails
            translations = {
                pt: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Reproduzir Múltiplos", autokillLabel: "Auto-Kill Anterior", loadMultipleSoundsButton: "Carregar Múltiplos Sons", stopAllSoundsButton: "Parar Todos os Sons (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Início Imediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Paragem Imediata)", howToUseTitle: "Como Usar:", dragDropHelp: "<strong>Arrastar e Largar:</strong> Arraste ficheiros de áudio (MP3, WAV, OGG) para as células para as preencher.", clickHelp: "<strong>Clicar:</strong> Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.", shortcutsHelp: "<strong>Atalhos de Teclado:</strong> Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: Q para a primeira célula).", navigationHelp: "<strong>Navegação (Modo QLab):</strong> Pressione <kbd>Espaço</kbd> para tocar o próximo som disponível. Pressione <kbd>Ctrl</kbd> + <kbd>Espaço</kbd> para tocar o som disponível anterior. Células vazias são ignoradas.", stopAllHelp: "<strong>Parar Sons:</strong> Pressione <kbd>ESC</kbd> para parar todos os sons a tocar.", volumeHelp: "<strong>Ajustar Volume:</strong> Use o slider de volume ou as teclas <kbd>⬆️</kbd> e <kbd>⬇️</kbd> para controlar o volume global.", deleteSoundHelp: "<strong>Apagar Som:</strong> Clique no <span style=\"font-size:1.1em;\">❌</span> no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga; um clique longo (>0.5s) faz fade out.*", replaceSoundHelp: "<strong>Substituir Som:</strong> Clique no <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> para carregar um novo som para a célula.", renameHelp: "<strong>Mudar Nome:</strong> Clique no nome do som para editá-lo.", fadeInHelp: "<strong>Controlar Fade In:</strong> Use o slider de Fade In, ou as teclas <kbd>Ctrl</kbd> + teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade in em segundos.", fadeOutControlHelp: "<strong>Controlar Fade Out:</strong> Use o slider de Fade Out, ou as teclas numéricas <kbd>0</kbd>-<kbd>9</kbd> para definir a duração do fade out em segundos.", playMultipleModeHelp: "<strong>Modo Reproduzir Múltiplos:</strong> Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.", autokillModeHelp: "<strong>Modo Auto-Kill Anterior:</strong> Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.", alertInvalidFile: "Tipo de ficheiro inválido. Por favor, arraste ficheiros de áudio (MP3, WAV, OGG).", alertLoadError: "Não foi possível carregar o áudio '{fileName}'.", alertDecodeError: "Erro ao descodificar o áudio '{soundName}'.", alertNoEmptyCells: "Não há mais células vazias para carregar o ficheiro '{fileName}'.", cellEmptyText: "Clique para carregar o som", cellNoName: "Sem Nome", cellEmptyDefault: "Vazio", loopButtonTitle: "Ativar/Desativar Loop", cueHelp: "<strong>CUE / GO:</strong> Pressione <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para 'cue' (marcar) um som. Pressione <kbd>Enter</kbd> para tocar todos os sons em 'cue' com fade-in. Pressione <kbd>Shift</kbd> + <kbd>Enter</kbd> para parar todos os sons em 'cue' com fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Pressione <kbd>Ctrl</kbd> + clique na célula para adicionar/remover um som do 'cue'.", removeCueHelp: "<strong>Remover CUE:</strong> Pressione <kbd>Alt</kbd> + <kbd>Enter</kbd> para remover todos os sons do 'cue' sem os parar.", toggleHelpButton: "Mostrar Ajuda", clearAllCellsButton: "Limpar Todas as Células", confirmStopAll: "Tem certeza que deseja parar todos os sons?", yesButton: "Sim", noButton: "Não",
                    noMoreSoundsForward: "Não há mais sons para tocar para a frente.", noMoreSoundsBackward: "Não há mais sons para tocar para trás."
                },
                en: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Play Multiple", autokillLabel: "Auto-Kill Previous", loadMultipleSoundsButton: "Load Multiple Sounds", stopAllSoundsButton: "Stop All Sounds (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Immediate Start)", fadeOutLabel: "Fade Out:", immediateStop: " (Immediate Stop)", howToUseTitle: "How To Use:", dragDropHelp: "<strong>Drag & Drop:</strong> Drag audio files (MP3, WAV, OGG) onto cells to fill them.", clickHelp: "<strong>Click:</strong> Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.", shortcutsHelp: "<strong>Keyboard Shortcuts:</strong> Press the corresponding key on your keyboard to play the sound. (e.g., Q for the first cell).", navigationHelp: "<strong>Navigation (QLab Mode):</strong> Press <kbd>Space</kbd> to play the next available sound. Press <kbd>Ctrl</kbd> + <kbd>Space</kbd> to play the previous available sound. Empty cells are skipped.", stopAllHelp: "<strong>Stop Sounds:</strong> Press <kbd>ESC</kbd> to stop all playing sounds.", volumeHelp: "<strong>Adjust Volume:</strong> Use the volume slider or the <kbd>⬆️</kbd> and <kbd>⬇️</kbd> keys to control global volume.", deleteSoundHelp: "<strong>Delete Sound:</strong> Click the <span style=\"font-size:1.1em;\">❌</span> in the top right corner of a cell to clear it. *A quick click deletes; a long click (>0.5s) fades out.*", replaceSoundHelp: "<strong>Replace Sound:</strong> Click the <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> to upload a new sound to the cell.", renameHelp: "<strong>Rename Sound:</strong> Click the sound's name to edit it.", fadeInHelp: "<strong>Control Fade In:</strong> Use the Fade In slider, or press <kbd>Ctrl</kbd> + number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-in duration in seconds.", fadeOutControlHelp: "<strong>Control Fade Out:</strong> Use the Fade Out slider, or press number keys <kbd>0</kbd>-<kbd>9</kbd> to set fade-out duration in seconds.", playMultipleModeHelp: "<strong>Play Multiple Mode:</strong> Allows multiple sounds to play simultaneously if checked.", autokillModeHelp: "<strong>Auto-Kill Previous Mode:</strong> When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.", alertInvalidFile: "Invalid file type. Please drag audio files (MP3, WAV, OGG).", alertLoadError: "Could not load audio '{fileName}'.", alertDecodeError: "Error decoding audio '{soundName}'.", alertNoEmptyCells: "No more empty cells to load file '{fileName}'.", cellEmptyText: "Click to load sound", cellNoName: "No Name", cellEmptyDefault: "Empty", loopButtonTitle: "Loop (Toggle)", cueHelp: "<strong>CUE / GO:</strong> Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to 'cue' (mark) a sound. Press <kbd>Enter</kbd> to play all 'cued' sounds with fade-in. Press <kbd>Shift</kbd> + <kbd>Enter</kbd> to stop all 'cued' sounds with fade-out.", cueSingleHelp: "<strong>CUE Individual:</strong> Press <kbd>Ctrl</kbd> + click on the cell to add/remove a sound from 'cue'.", removeCueHelp: "<strong>Remove CUE:</strong> Press <kbd>Alt</kbd> + <kbd>Enter</kbd> to remove all cued sounds without stopping them.", toggleHelpButton: "Show Help", clearAllCellsButton: "Clear All Cells", confirmStopAll: "Are you sure you want to stop all sounds?", yesButton: "Yes", noButton: "No",
                    noMoreSoundsForward: "No more sounds to play forward.", noMoreSoundsBackward: "No more sounds to play backward."
                },
                it: {
                    title: "Soundboard QWERTY", mainTitle: "Soundboard QWERTY", volumeLabel: "Volume:", playMultipleLabel: "Riproduci Multipli", autokillLabel: "Auto-Stop Precedente", loadMultipleSoundsButton: "Carica Più Suoni", stopAllSoundsButton: "Ferma Tutti i Suoni (ESC)", fadeInLabel: "Fade In:", immediateStart: " (Avvio Immediato)", fadeOutLabel: "Fade Out:", immediateStop: " (Arresto Immediato)", howToUseTitle: "Come Usare:", dragDropHelp: "<strong>Trascina e Rilascia:</strong> Trascina file audio (MP3, WAV, OGG) sulle celle per riempirle.", clickHelp: "<strong>Clicca:</strong> Clicca una cella vuota per aprire una finestra di selezione file. Clicca una cella piena per riprodurre il suono.", shortcutsHelp: "<strong>Scorciatoie da Tastiera:</strong> Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: Q per la prima cella).", navigationHelp: "<strong>Navigazione (Modalità QLab):</strong> Premi <kbd>Spazio</kbd> per riprodurre il suono disponibile successivo. Premi <kbd>Ctrl</kbd> + <kbd>Spazio</kbd> per riprodurre il suono disponibile precedente. Le celle vuote vengono saltate.", stopAllHelp: "<strong>Ferma Suoni:</strong> Premi <kbd>ESC</kbd> per fermare tutti i suoni in riproduzione.", volumeHelp: "<strong>Regola Volume:</strong> Usa il cursore del volume o i tasti <kbd>⬆️</kbd> e <kbd>⬇️</kbd> per controllare il volume globale.", deleteSoundHelp: "<strong>Elimina Suono:</strong> Clicca sulla <span style=\"font-size:1.1em;\">❌</span> nell'angolo in alto a destra di una cella per svuotarla. *Un clic rapido elimina; un clic lungo (>0.5s) esegue il fade out.*", replaceSoundHelp: "<strong>Sostituisci Suono:</strong> Clicca su <span class=\"material-symbols-outlined\" style=\"vertical-align: middle; font-size: 1.1em;\">upload_file</span> per caricare un nuovo suono nella cella.", renameHelp: "<strong>Rinomina Suono:</strong> Clicca sul nome del suono per modificarlo.", fadeInHelp: "<strong>Controlla Fade In:</strong> Usa lo slider Fade In, o premi <kbd>Ctrl</kbd> + tasti numerici <kbd>0</kbd>-<kbd>9</kbd> per impostare la durata del fade-in in secondi.", fadeOutControlHelp: "<strong>Controlla Fade Out:</strong> Usa lo slider Fade Out, o premi i tasti numerici <kbd>0</kbd>-<kbd>9</kbd> per impostare la durata del fade-out in secondi.", playMultipleModeHelp: "<strong>Modalità Riproduci Multipli:</strong> Permette a più suoni di essere riprodotti contemporaneamente se la casella è selezionata.", autokillModeHelp: "<strong>Modalità Auto-Stop Precedente:</strong> Quando viene riprodotto un nuovo suono, il suono precedentemente attivo (se presente) verrà fermato con un rapido fade out.", alertInvalidFile: "Tipo di file non valido. Si prega di trascinare file audio (MP3, WAV, OGG).", alertLoadError: "Impossibile caricare l'audio '{fileName}'.", alertDecodeError: "Errore durante la decodifica dell'audio '{soundName}'.", alertNoEmptyCells: "Non ci sono più celle vuote per caricare il file '{fileName}'.", cellEmptyText: "Clicca per caricare il suono", cellNoName: "Senza Nome", cellEmptyDefault: "Vuoto", loopButtonTitle: "Loop (Attiva/Disattiva)", cueHelp: "<strong>CUE / GO:</strong> Premi <kbd>Ctrl</kbd> + <kbd>Invio</kbd> per 'cue' (segnare) un suono. Premi <kbd>Invio</kbd> per riprodurre tutti i suoni in 'cue' con fade-in. Premi <kbd>Shift</kbd> + <kbd>Invio</kbd> per fermare tutti i suoni in 'cue' con fade-out.", cueSingleHelp: "<strong>CUE Individuale:</strong> Premi <kbd>Ctrl</kbd> + clic sulla cella per aggiungere/rimuovere un suono dal 'cue'.", removeCueHelp: "<strong>Rimuovi CUE:</strong> Premi <kbd>Alt</kbd> + <kbd>Invio</kbd> per rimuovere tutti i suoni in cue senza fermarli.", toggleHelpButton: "Mostra Aiuto", clearAllCellsButton: "Cancella Tutte le Celle", confirmStopAll: "Sei sicuro di voler fermare tutti i suoni?", yesButton: "Sì", noButton: "No",
                    noMoreSoundsForward: "Nessun altro suono da riprodurre in avanti.", noMoreSoundsBackward: "Nessun altro suono da riprodurre all'indietro."
                }
            };
            setLanguageCallback('pt');
        }
    }

    function setLanguage(lang, domElements, soundData, updateCellDisplay, utils) {
        if (!translations[lang]) {
            console.warn(`Idioma ${lang} não encontrado. Usando PT como fallback.`);
            lang = 'pt';
        }
        currentLanguage = lang;
        localStorage.setItem('soundboardLanguage', lang);

        domElements.titleElement.textContent = translations[lang].title;

        // Update all elements with data-key
        domElements.allDataKeyElements.forEach(element => {
            const key = element.dataset.key;
            if (translations[lang][key]) {
                // Special handling for elements where text content is directly applied or HTML
                if (element.tagName === 'LABEL' || element.tagName === 'BUTTON' || element.tagName === 'H1' || element.tagName === 'H3' || element.tagName === 'P') {
                    element.textContent = translations[lang][key];
                } else if (element.tagName === 'LI') {
                    element.innerHTML = translations[lang][key]; // For list items with inner HTML (like <kbd>)
                }
                // Input ranges and checkboxes are updated by specific functions
            }
        });

        // Update display for ranges, as they have dynamic text based on value
        utils.updateFadeOutDisplay(domElements.fadeOutRange, domElements.fadeOutDisplay, translations, currentLanguage);
        utils.updateFadeInDisplay(domElements.fadeInRange, domElements.fadeInDisplay, translations, currentLanguage);

        // Update cell specific texts
        domElements.soundCells.forEach(cell => {
            const index = parseInt(cell.dataset.index);
            const data = soundData[index];

            const nameDisplay = cell.querySelector('.sound-name');
            if (nameDisplay) {
                nameDisplay.textContent = data && data.name ? data.name : translations[currentLanguage].cellEmptyDefault;
                nameDisplay.title = translations[currentLanguage].renameHelp.replace(/<[^>]*>/g, '');
            }

            const deleteButton = cell.querySelector('.delete-button');
            if (deleteButton) {
                deleteButton.title = translations[currentLanguage].deleteSoundHelp.replace(/<[^>]*>/g, '');
            }
            const replaceButton = cell.querySelector('.replace-sound-button');
            if (replaceButton) {
                replaceButton.title = translations[currentLanguage].replaceSoundHelp.replace(/<[^>]*>/g, '');
            }
            const loopButton = cell.querySelector('.loop-button');
            if (loopButton) {
                loopButton.title = translations[currentLanguage].loopButtonTitle || 'Loop (Toggle)';
            }
            // Reapply visual state for cells if already loaded
            if (data) {
                updateCellDisplay(cell, data, false, getTranslation);
            } else {
                updateCellDisplay(cell, { name: translations[currentLanguage].cellEmptyDefault }, true, getTranslation);
            }
        });

        // Update language buttons active state
        domElements.langButtons.forEach(button => {
            if (button.dataset.lang === lang) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    function getTranslation(key) {
        return translations[currentLanguage] ? translations[currentLanguage][key] : `KEY_NOT_FOUND: ${key}`;
    }

    function getCurrentLanguage() {
        return currentLanguage;
    }

    function getTranslationsObject() {
        return translations;
    }

    return {
        loadTranslations: loadTranslations,
        setLanguage: setLanguage,
        getTranslation: getTranslation,
        getCurrentLanguage: getCurrentLanguage,
        getTranslationsObject: getTranslationsObject
    };
})();
