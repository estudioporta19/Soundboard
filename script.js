document.addEventListener('DOMContentLoaded', () => {
    // Contexto de Áudio para reprodução de som
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Armazenar os AudioBufferSourceNode e GainNode para controlo (parar, fade out)
    let playingSounds = {}; // { soundId: { audioNode: AudioBufferSourceNode, gainNode: GainNode, cellIndex: number } }
    let lastSoundId = 0; // Para dar IDs únicos a cada som em reprodução

    // Armazenar referências às células de som
    const soundCells = {};

    // Elementos do DOM
    const volumeRange = document.getElementById('volume-range');
    const volumeDisplay = document.getElementById('volume-display');
    const playMultipleCheckbox = document.getElementById('play-multiple');
    const autokillCheckbox = document.getElementById('autokill-mode');
    const fadeInRange = document.getElementById('fadeIn-range');
    const fadeInDisplay = document.getElementById('fadeIn-display');
    const fadeOutRange = document.getElementById('fadeOut-range');
    const fadeoutDisplay = document.getElementById('fadeout-display');
    const loadSoundsButtonGeneral = document.getElementById('load-sounds-button-general');

    // Referências aos elementos do popup (NOVOS)
    const stopAllSoundsButton = document.getElementById('stop-all-sounds');
    const stopConfirmationPopup = document.getElementById('stop-confirmation-popup');
    const confirmStopYesButton = document.getElementById('confirm-stop-yes');
    const confirmStopNoButton = document.getElementById('confirm-stop-no');

    // Mapeamento de teclas para IDs de célula
    const keyMap = {
        'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4, 'y': 5, 'u': 6, 'i': 7, 'o': 8, 'p': 9,
        'a': 10, 's': 11, 'd': 12, 'f': 13, 'g': 14, 'h': 15, 'j': 16, 'k': 17, 'l': 18,
        'z': 19, 'x': 20, 'c': 21, 'v': 22, 'b': 23, 'n': 24, 'm': 25, ',': 26, '.': 27
    };

    // Array para armazenar os AudioBuffers dos sons carregados
    const loadedSounds = new Array(Object.keys(keyMap).length).fill(null);
    const soundNames = new Array(Object.keys(keyMap).length).fill("");

    // Variáveis para o modo QLab e Cue
    let qlabModeIndex = -1; // -1 significa nenhum som em QLab
    let cuedSounds = new Set(); // Armazena os índices das células em cue

    // Traduções (ATUALIZADAS COM POPUP)
    const translations = {
        pt: {
            title: "Soundboard QWERTY",
            mainTitle: "Soundboard QWERTY",
            volumeLabel: "Volume:",
            playMultipleLabel: "Reproduzir Múltiplos",
            autokillLabel: "Auto-Kill Anterior",
            loadMultipleSoundsButton: "Carregar Múltiplos Sons",
            stopAllSoundsButton: "Parar Todos os Sons (ESC)",
            fadeInLabel: "Fade In:",
            fadeOutLabel: "Fade Out:",
            toggleHelpButton: "Mostrar Ajuda",
            howToUseTitle: "Como Usar:",
            dragDropHelp: "Arrastar e Largar: Arraste ficheiros de áudio (MP3, WAV, OGG) para as células para as preencher.",
            clickHelp: "Clicar: Clique numa célula vazia para abrir um diálogo de seleção de ficheiro. Clique numa célula preenchida para reproduzir o som.",
            shortcutsHelp: "Atalhos de Teclado: Pressione a tecla correspondente no seu teclado para reproduzir o som. (Ex: Q para a primeira célula).",
            navigationHelp: "Navegação (Modo QLab): Pressione Espaço para tocar o próximo som disponível. Pressione Ctrl + Espaço para tocar o som disponível anterior. Células vazias são ignoradas.",
            stopAllHelp: "Parar Sons: Pressione ESC para parar todos os sons a tocar.",
            volumeHelp: "Ajustar Volume: Use o slider de volume ou as teclas ⬆️ e ⬇️ para controlar o volume global.",
            deleteSoundHelp: "Apagar Som: Clique no ❌ no canto superior direito de uma célula para a esvaziar. *Um clique rápido apaga; um clique longo (>0.5s) faz fade out.*",
            replaceSoundHelp: "Substituir Som: Clique no ⬆️ para carregar um novo som para a célula.",
            renameHelp: "Mudar Nome: Clique no nome do som para editá-lo.",
            fadeInHelp: "Controlar Fade In: Use o slider de Fade In, ou as teclas Ctrl + teclas numéricas 0-9 para definir a duração do fade in em segundos.",
            fadeOutControlHelp: "Controlar Fade Out: Use o slider de Fade Out, ou as teclas numéricas 0-9 para definir a duração do fade out em segundos.",
            playMultipleModeHelp: "Modo Reproduzir Múltiplos: Permite que vários sons toquem ao mesmo tempo se a caixa estiver marcada.",
            autokillModeHelp: "Modo Auto-Kill Anterior: Ao tocar um novo som, o som anteriormente ativo (se houver) será parado com um fade out rápido.",
            cueHelp: "CUE / GO: Pressione Ctrl + Enter para 'cue' (marcar) um som. Pressione Enter para tocar todos os sons em 'cue' com fade-in. Pressione Shift + Enter para parar todos os sons em 'cue' com fade-out.",
            cueSingleHelp: "CUE Individual: Pressione Ctrl + clique na célula para adicionar/remover um som do 'cue'.",
            removeCueHelp: "Remover CUE: Pressione Alt + Enter para remover todos os sons do 'cue' sem os parar.",
            cellEmptyDefault: "Vazio",
            confirmStopAll: "Tem certeza que deseja parar todos os sons?", // NOVO
            yesButton: "Sim", // NOVO
            noButton: "Não" // NOVO
        },
        en: {
            title: "QWERTY Soundboard",
            mainTitle: "QWERTY Soundboard",
            volumeLabel: "Volume:",
            playMultipleLabel: "Play Multiple",
            autokillLabel: "Auto-Kill Previous",
            loadMultipleSoundsButton: "Load Multiple Sounds",
            stopAllSoundsButton: "Stop All Sounds (ESC)",
            fadeInLabel: "Fade In:",
            fadeOutLabel: "Fade Out:",
            toggleHelpButton: "Show Help",
            howToUseTitle: "How to Use:",
            dragDropHelp: "Drag & Drop: Drag audio files (MP3, WAV, OGG) into cells to populate them.",
            clickHelp: "Click: Click an empty cell to open a file selection dialog. Click a filled cell to play the sound.",
            shortcutsHelp: "Keyboard Shortcuts: Press the corresponding key on your keyboard to play the sound. (Ex: Q for the first cell).",
            navigationHelp: "Navigation (QLab Mode): Press Space to play the next available sound. Press Ctrl + Space to play the previous available sound. Empty cells are skipped.",
            stopAllHelp: "Stop Sounds: Press ESC to stop all playing sounds.",
            volumeHelp: "Adjust Volume: Use the volume slider or the ⬆️ and ⬇️ keys to control global volume.",
            deleteSoundHelp: "Delete Sound: Click the ❌ in the top right corner of a cell to clear it. *A quick click deletes; a long click (>0.5s) fades out.*",
            replaceSoundHelp: "Replace Sound: Click the ⬆️ to load a new sound into the cell.",
            renameHelp: "Rename: Click the sound name to edit it.",
            fadeInHelp: "Control Fade In: Use the Fade In slider, or Ctrl + number keys 0-9 to set fade in duration in seconds.",
            fadeOutControlHelp: "Control Fade Out: Use the Fade Out slider, or number keys 0-9 to set fade out duration in seconds.",
            playMultipleModeHelp: "Play Multiple Mode: Allows multiple sounds to play simultaneously if the box is checked.",
            autokillModeHelp: "Auto-Kill Previous Mode: When playing a new sound, the previously active sound (if any) will be stopped with a quick fade out.",
            cueHelp: "CUE / GO: Press Ctrl + Enter to 'cue' a sound. Press Enter to play all cued sounds with fade-in. Press Shift + Enter to stop all cued sounds with fade-out.",
            cueSingleHelp: "Individual CUE: Press Ctrl + click on the cell to add/remove a sound from the 'cue'.",
            removeCueHelp: "Remove CUE: Press Alt + Enter to remove all sounds from the 'cue' without stopping them.",
            cellEmptyDefault: "Empty",
            confirmStopAll: "Are you sure you want to stop all sounds?", // NOVO
            yesButton: "Yes", // NOVO
            noButton: "No" // NOVO
        },
        it: {
            title: "Soundboard QWERTY",
            mainTitle: "Soundboard QWERTY",
            volumeLabel: "Volume:",
            playMultipleLabel: "Riproduci Multipli",
            autokillLabel: "Auto-Kill Precedente",
            loadMultipleSoundsButton: "Carica Suoni Multipli",
            stopAllSoundsButton: "Ferma Tutti i Suoni (ESC)",
            fadeInLabel: "Fade In:",
            fadeOutLabel: "Fade Out:",
            toggleHelpButton: "Mostra Aiuto",
            howToUseTitle: "Come Usare:",
            dragDropHelp: "Trascina e Rilascia: Trascina i file audio (MP3, WAV, OGG) nelle celle per riempirle.",
            clickHelp: "Clicca: Clicca su una cella vuota per aprire una finestra di selezione file. Clicca su una cella riempita per riprodurre il suono.",
            shortcutsHelp: "Scorciatoie da Tastiera: Premi il tasto corrispondente sulla tastiera per riprodurre il suono. (Es: Q per la prima cella).",
            navigationHelp: "Navigazione (Modalità QLab): Premi Spazio per riprodurre il suono disponibile successivo. Premi Ctrl + Spazio per riprodurre il suono disponibile precedente. Le celle vuote vengono ignorate.",
            stopAllHelp: "Ferma Suoni: Premi ESC per fermare tutti i suoni in riproduzione.",
            volumeHelp: "Regola Volume: Usa lo slider del volume o i tasti ⬆️ e ⬇️ per controllare il volume globale.",
            deleteSoundHelp: "Elimina Suono: Clicca sulla ❌ nell'angolo in alto a destra di una cella per svuotarla. *Un click rapido elimina; un click lungo (>0.5s) effettua un fade out.*",
            replaceSoundHelp: "Sostituisci Suono: Clicca sulla ⬆️ per caricare un nuovo suono nella cella.",
            renameHelp: "Rinomina: Clicca sul nome del suono per modificarlo.",
            fadeInHelp: "Controlla Fade In: Usa lo slider Fade In, o Ctrl + tasti numerici 0-9 per impostare la durata del fade in in secondi.",
            fadeOutControlHelp: "Controlla Fade Out: Usa lo slider Fade Out, o i tasti numerici 0-9 per impostare la durata del fade out in secondi.",
            playMultipleModeHelp: "Modalità Riproduzione Multipla: Permette a più suoni di essere riprodotti contemporaneamente se la casella è selezionata.",
            autokillModeHelp: "Modalità Auto-Kill Precedente: Quando riproduci un nuovo suono, il suono precedentemente attivo (se presente) verrà fermato con un rapido fade out.",
            cueHelp: "CUE / GO: Premi Ctrl + Invio per 'cue' (marcare) un suono. Premi Invio per riprodurre tutti i suoni in 'cue' con fade-in. Premi Maiusc + Invio per fermare tutti i suoni in 'cue' con fade-out.",
            cueSingleHelp: "CUE Individuale: Premi Ctrl + click sulla cella per aggiungere/rimuovere un suono dal 'cue'.",
            removeCueHelp: "Rimuovi CUE: Premi Alt + Invio per rimuovere tutti i suoni dal 'cue' senza fermarli.",
            cellEmptyDefault: "Vuoto",
            confirmStopAll: "Sei sicuro di voler fermare tutti i suoni?", // NOVO
            yesButton: "Sì", // NOVO
            noButton: "No" // NOVO
        }
    };

    let currentLang = 'pt'; // Idioma padrão

    // Função para aplicar traduções
    function applyTranslations() {
        const elements = document.querySelectorAll('[data-key]');
        elements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (translations[currentLang] && translations[currentLang][key]) {
                el.textContent = translations[currentLang][key];
            }
        });
        // Atualizar também o texto do botão de ajuda que é dinâmico
        const toggleHelpButton = document.getElementById('toggle-help-button');
        if (toggleHelpButton.classList.contains('active')) {
            toggleHelpButton.textContent = translations[currentLang].hideHelpButton;
        } else {
            toggleHelpButton.textContent = translations[currentLang].toggleHelpButton;
        }
        // Atualizar os displays de fade in/out
        updateFadeInDisplay();
        updateFadeOutDisplay();
    }

    // Event listeners para os botões de idioma
    document.querySelectorAll('.lang-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.lang-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentLang = button.getAttribute('data-lang');
            applyTranslations();
        });
    });

    // Função para decodificar ficheiros de áudio
    async function decodeAudioFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const audioBuffer = await audioContext.decodeAudioData(e.target.result);
                    resolve(audioBuffer);
                } catch (error) {
                    console.error("Erro ao decodificar áudio:", error);
                    reject(error);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    // Função para reproduzir um som
    function playSound(audioBuffer, cellIndex) {
        if (!audioBuffer) return;

        // Se Auto-Kill Anterior estiver ativo, parar todos os sons existentes exceto os cued
        if (autokillCheckbox.checked && !cuedSounds.has(cellIndex)) {
            Object.values(playingSounds).forEach(sound => {
                // Não parar sons que estão a ser cued ou que já estão a fazer fade out
                if (!cuedSounds.has(sound.cellIndex) && sound.audioNode.playbackState === 2 /* PLAYING */) {
                    fadeOutSound(sound.audioNode, sound.gainNode, 0.1); // Fade out rápido
                    delete playingSounds[sound.id]; // Remove-o imediatamente do tracking
                }
            });
        }

        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Define o volume inicial
        gainNode.gain.value = volumeRange.value;

        const currentSoundId = lastSoundId++; // Atribui um ID único

        // Adiciona à lista de sons a tocar
        playingSounds[currentSoundId] = {
            id: currentSoundId,
            audioNode: source,
            gainNode: gainNode,
            cellIndex: cellIndex,
            timeoutId: null // Para o timeout do fade out automático/classe active
        };

        const fadeInDuration = parseFloat(fadeInRange.value);
        if (fadeInDuration > 0) {
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volumeRange.value, audioContext.currentTime + fadeInDuration);
        } else {
            gainNode.gain.setValueAtTime(volumeRange.value, audioContext.currentTime);
        }

        source.start(0);

        const cellElement = soundCells[cellIndex];
        if (cellElement) {
            cellElement.classList.add('active');
        }

        source.onended = () => {
            // Remove da lista de sons a tocar quando termina
            if (playingSounds[currentSoundId]) {
                delete playingSounds[currentSoundId];
            }
            if (cellElement) {
                cellElement.classList.remove('active');
            }
        };

        // Se 'Reproduzir Múltiplos' não estiver ativo, parar o som anterior na mesma célula
        if (!playMultipleCheckbox.checked) {
            // Itera sobre playingSounds para encontrar e parar o som anterior desta célula
            // A condição do autokill acima já lida com isto de forma mais abrangente.
            // Aqui, apenas garantiríamos que se um novo som na *mesma* célula for iniciado
            // e playMultiple não estiver ativo, o anterior para.
            // Para simplificar, a lógica de autokill já cobre isso.
        }
    }

    // Função para fazer fade out de um som (e pará-lo)
    function fadeOutSound(sourceNode, gainNode, duration = parseFloat(fadeOutRange.value)) {
        if (!sourceNode || !gainNode) return;

        const currentTime = audioContext.currentTime;
        const currentVolume = gainNode.gain.value; // Pega o volume atual

        // Se o volume já for 0 ou duração for 0, para imediatamente
        if (currentVolume <= 0.001 || duration <= 0.001) {
            sourceNode.stop();
            sourceNode.disconnect();
            gainNode.disconnect();
            return;
        }

        // Parar rampas de áudio anteriores para evitar conflitos
        gainNode.gain.cancelScheduledValues(currentTime);

        // Define a curva de fade out
        gainNode.gain.linearRampToValueAtTime(0.0001, currentTime + duration); // Quase zero para evitar clique

        // Agenda a paragem do som após o fade out
        sourceNode.stop(currentTime + duration + 0.05); // Pequena margem para garantir que a rampa termina
        sourceNode.onended = () => {
            sourceNode.disconnect();
            gainNode.disconnect();
            // Já removido de playingSounds na stopAllSounds ou playSound logic
        };
    }

    // Função para parar todos os sons (AGORA COM FADE OUT PADRÃO)
    function stopAllSounds() {
        Object.values(playingSounds).forEach(sound => {
            if (sound && sound.audioNode && sound.audioNode.playbackState === 2 /* PLAYING */) {
                fadeOutSound(sound.audioNode, sound.gainNode); // Usa o fade out padrão do slider
                const cell = document.querySelector(`.sound-cell[data-index="${sound.cellIndex}"]`);
                if (cell) {
                    cell.classList.remove('active');
                }
            }
        });
        playingSounds = {}; // Limpa o objeto de sons a tocar
        qlabModeIndex = -1; // Reset QLab mode
    }

    // Função para parar um som específico de uma célula
    function stopSoundInCell(cellIndex) {
        Object.keys(playingSounds).forEach(id => {
            const sound = playingSounds[id];
            if (sound && sound.cellIndex === cellIndex && sound.audioNode.playbackState === 2) {
                fadeOutSound(sound.audioNode, sound.gainNode);
                delete playingSounds[id];
            }
        });
        const cell = soundCells[cellIndex];
        if (cell) {
            cell.classList.remove('active');
        }
    }


    // Cria as células da soundboard
    function createSoundboard() {
        const rows = {
            'row-top': ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            'row-home': ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            'row-bottom': ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.']
        };

        let cellIndex = 0;
        for (const rowId in rows) {
            const rowElement = document.getElementById(rowId);
            rows[rowId].forEach(key => {
                const cell = document.createElement('div');
                cell.classList.add('sound-cell');
                cell.dataset.key = key;
                cell.dataset.index = cellIndex;

                const keyDisplay = document.createElement('span');
                keyDisplay.classList.add('key-display');
                keyDisplay.textContent = key.toUpperCase();
                cell.appendChild(keyDisplay);

                const soundName = document.createElement('span');
                soundName.classList.add('sound-name');
                soundName.textContent = translations[currentLang].cellEmptyDefault; // Definir texto padrão
                soundName.contentEditable = true; // Permite editar o nome
                soundName.spellcheck = false; // Desativa corretor ortográfico
                soundName.addEventListener('blur', (e) => {
                    const newName = e.target.textContent.trim();
                    if (newName === "" || newName === translations[currentLang].cellEmptyDefault) {
                        e.target.textContent = translations[currentLang].cellEmptyDefault;
                        soundNames[cell.dataset.index] = "";
                    } else {
                        soundNames[cell.dataset.index] = newName;
                    }
                    localStorage.setItem(`soundName_${cell.dataset.index}`, soundNames[cell.dataset.index]);
                });
                soundName.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); // Evita quebra de linha
                        e.target.blur(); // Sai do modo de edição
                    }
                });
                cell.appendChild(soundName);

                // Botão de deletar (❌)
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-button');
                deleteButton.innerHTML = '&#x274C;'; // Símbolo X
                deleteButton.title = "Apagar Som (Clique curto: apagar, Clique longo: fade out)";
                cell.appendChild(deleteButton);

                let deletePressTimer;
                deleteButton.addEventListener('mousedown', (e) => {
                    e.stopPropagation(); // Previne que o clique na célula seja ativado
                    deletePressTimer = setTimeout(() => {
                        // Se o botão for segurado por 500ms, faz fade out
                        if (loadedSounds[cell.dataset.index]) {
                            stopSoundInCell(parseInt(cell.dataset.index));
                        }
                    }, 500); // 500ms para clique longo
                });

                deleteButton.addEventListener('mouseup', (e) => {
                    clearTimeout(deletePressTimer);
                    e.stopPropagation(); // Previne que o clique na célula seja ativado
                    if (e.detail === 1 && (e.timeStamp - e.target.dataset.mouseDownTime < 500 || !e.target.dataset.mouseDownTime)) {
                        // Se for um clique rápido ou não houver mouseDownTime (para evitar bug duplo)
                        deleteSound(parseInt(cell.dataset.index));
                    }
                    delete e.target.dataset.mouseDownTime; // Limpa o timestamp
                });
                deleteButton.addEventListener('mouseleave', () => {
                    clearTimeout(deletePressTimer);
                });
                deleteButton.addEventListener('click', (e) => e.stopPropagation()); // Evita clique na célula principal

                // Botão de loop (🔄)
                const loopButton = document.createElement('button');
                loopButton.classList.add('loop-button');
                loopButton.innerHTML = '<span class="material-symbols-outlined">loop</span>';
                loopButton.title = "Ativar/Desativar Loop";
                cell.appendChild(loopButton);

                loopButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleLoop(parseInt(cell.dataset.index));
                });

                // Botão para substituir som (⬆️)
                const replaceSoundButton = document.createElement('button');
                replaceSoundButton.classList.add('replace-sound-button');
                replaceSoundButton.innerHTML = '<span class="material-symbols-outlined">upload_file</span>';
                replaceSoundButton.title = "Substituir Som";
                cell.appendChild(replaceSoundButton);

                replaceSoundButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'audio/*';
                    fileInput.onchange = async (event) => {
                        const file = event.target.files[0];
                        if (file) {
                            try {
                                const audioBuffer = await decodeAudioFile(file);
                                loadedSounds[cell.dataset.index] = audioBuffer;
                                updateCellContent(cell, file.name);
                                saveSoundToLocalStorage(cell.dataset.index, file, file.name);
                            } catch (error) {
                                alert("Erro ao carregar ou decodificar o ficheiro de áudio.");
                                console.error(error);
                            }
                        }
                    };
                    fileInput.click();
                });


                // Drag and Drop listeners
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
                    if (file && file.type.startsWith('audio/')) {
                        try {
                            const audioBuffer = await decodeAudioFile(file);
                            loadedSounds[cell.dataset.index] = audioBuffer;
                            updateCellContent(cell, file.name);
                            saveSoundToLocalStorage(cell.dataset.index, file, file.name);
                        } catch (error) {
                            alert("Erro ao carregar ou decodificar o ficheiro de áudio.");
                            console.error(error);
                        }
                    }
                });

                // Click listener para carregar ou reproduzir
                cell.addEventListener('click', async (e) => {
                    // Se o clique for para cue com Ctrl
                    if (e.ctrlKey) {
                        toggleCue(parseInt(cell.dataset.index));
                        return;
                    }

                    const index = parseInt(cell.dataset.index);
                    if (loadedSounds[index]) {
                        playSound(loadedSounds[index], index);
                        qlabModeIndex = index; // Define o som atual para o modo QLab
                    } else {
                        // Se a célula estiver vazia, abre o diálogo de seleção de ficheiro
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'audio/*';
                        fileInput.onchange = async (event) => {
                            const file = event.target.files[0];
                            if (file) {
                                try {
                                    const audioBuffer = await decodeAudioFile(file);
                                    loadedSounds[index] = audioBuffer;
                                    updateCellContent(cell, file.name);
                                    saveSoundToLocalStorage(index, file, file.name);
                                } catch (error) {
                                    alert("Erro ao carregar ou decodificar o ficheiro de áudio.");
                                    console.error(error);
                                }
                            }
                        };
                        fileInput.click();
                    }
                });

                rowElement.appendChild(cell);
                soundCells[cellIndex] = cell; // Armazenar referência à célula
                cellIndex++;
            });
        }
        loadSoundsFromLocalStorage(); // Carrega os sons guardados ao iniciar
    }

    // Função para atualizar o conteúdo da célula
    function updateCellContent(cell, fileName) {
        const index = parseInt(cell.dataset.index);
        const soundNameElement = cell.querySelector('.sound-name');
        let displayFileName = fileName.split('/').pop().split('.')[0]; // Pega apenas o nome do ficheiro sem extensão
        soundNameElement.textContent = displayFileName;
        soundNames[index] = displayFileName;
        cell.classList.add('filled');
        cell.classList.remove('empty');
        // Mostrar botões de controle quando a célula está preenchida
        cell.querySelector('.delete-button').style.display = 'flex';
        cell.querySelector('.loop-button').style.display = 'flex';
        cell.querySelector('.replace-sound-button').style.display = 'flex';
    }

    // Função para deletar um som de uma célula
    function deleteSound(index) {
        // Para qualquer instância do som a tocar
        Object.keys(playingSounds).forEach(id => {
            const sound = playingSounds[id];
            if (sound && sound.cellIndex === index) {
                if (sound.audioNode && sound.audioNode.playbackState === 2) {
                    sound.audioNode.stop();
                    sound.audioNode.disconnect();
                    sound.gainNode.disconnect();
                }
                delete playingSounds[id];
            }
        });
        loadedSounds[index] = null; // Remove o AudioBuffer
        soundNames[index] = ""; // Limpa o nome

        const cell = soundCells[index];
        const soundNameElement = cell.querySelector('.sound-name');
        soundNameElement.textContent = translations[currentLang].cellEmptyDefault; // Texto padrão "Vazio"
        cell.classList.remove('filled', 'active', 'cued'); // Remove classes
        cell.classList.add('empty');

        // Esconder botões de controle
        cell.querySelector('.delete-button').style.display = 'none';
        cell.querySelector('.loop-button').style.display = 'none';
        cell.querySelector('.replace-sound-button').style.display = 'none';
        
        // Remove do LocalStorage
        localStorage.removeItem(`sound_${index}`);
        localStorage.removeItem(`soundName_${index}`);
        localStorage.removeItem(`isLooping_${index}`);
        
        cuedSounds.delete(index); // Remove da lista de sons em cue
    }


    // Função para salvar o som no Local Storage (como Base64)
    function saveSoundToLocalStorage(index, file, fileName) {
        const reader = new FileReader();
        reader.onload = (e) => {
            localStorage.setItem(`sound_${index}`, e.target.result);
            localStorage.setItem(`soundName_${index}`, fileName);
        };
        reader.readAsDataURL(file);
    }

    // Função para carregar sons do Local Storage
    async function loadSoundsFromLocalStorage() {
        for (let i = 0; i < loadedSounds.length; i++) {
            const base64 = localStorage.getItem(`sound_${i}`);
            const savedName = localStorage.getItem(`soundName_${i}`);
            const isLooping = localStorage.getItem(`isLooping_${i}`) === 'true';

            if (base64) {
                try {
                    const response = await fetch(base64);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    loadedSounds[i] = audioBuffer;

                    const cell = soundCells[i];
                    updateCellContent(cell, savedName || translations[currentLang].cellEmptyDefault);

                    if (isLooping) {
                        toggleLoop(i); // Reativa o loop se estava ativo
                    }
                } catch (error) {
                    console.error(`Erro ao carregar som ${i} do LocalStorage:`, error);
                    // Se houver erro, limpar o item para evitar futuros problemas
                    localStorage.removeItem(`sound_${i}`);
                    localStorage.removeItem(`soundName_${i}`);
                    localStorage.removeItem(`isLooping_${i}`);
                    const cell = soundCells[i];
                    if (cell) {
                         cell.querySelector('.sound-name').textContent = translations[currentLang].cellEmptyDefault;
                         cell.classList.remove('filled', 'active', 'cued');
                         cell.classList.add('empty');
                         cell.querySelector('.delete-button').style.display = 'none';
                         cell.querySelector('.loop-button').style.display = 'none';
                         cell.querySelector('.replace-sound-button').style.display = 'none';
                    }
                }
            } else {
                 // Garante que células sem som no storage estejam vazias no UI
                const cell = soundCells[i];
                if (cell) {
                    cell.querySelector('.sound-name').textContent = translations[currentLang].cellEmptyDefault;
                    cell.classList.remove('filled', 'active', 'cued');
                    cell.classList.add('empty');
                    cell.querySelector('.delete-button').style.display = 'none';
                    cell.querySelector('.loop-button').style.display = 'none';
                    cell.querySelector('.replace-sound-button').style.display = 'none';
                }
            }
        }
    }

    // Função para ativar/desativar loop
    function toggleLoop(index) {
        const cell = soundCells[index];
        if (!cell) return;

        // Se houver um som a tocar nesta célula, aplicamos o loop a ele
        Object.values(playingSounds).forEach(sound => {
            if (sound.cellIndex === index && sound.audioNode) {
                sound.audioNode.loop = !sound.audioNode.loop;
                if (sound.audioNode.loop) {
                    cell.querySelector('.loop-button').classList.add('active');
                    localStorage.setItem(`isLooping_${index}`, 'true');
                } else {
                    cell.querySelector('.loop-button').classList.remove('active');
                    localStorage.setItem(`isLooping_${index}`, 'false');
                }
            }
        });

        // Se não houver som a tocar, apenas muda o estado visual e no localStorage
        // Para que o próximo som que tocar já inicie em loop
        const loopButton = cell.querySelector('.loop-button');
        const isCurrentlyLooping = loopButton.classList.contains('active');

        if (!isCurrentlyLooping) {
            loopButton.classList.add('active');
            localStorage.setItem(`isLooping_${index}`, 'true');
        } else {
            loopButton.classList.remove('active');
            localStorage.setItem(`isLooping_${index}`, 'false');
        }
    }


    // Função para carregar múltiplos sons de uma vez
    loadSoundsButtonGeneral.addEventListener('click', async () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.multiple = true; // Permite selecionar múltiplos ficheiros
        fileInput.onchange = async (event) => {
            const files = Array.from(event.target.files);
            let currentCellToFill = 0;

            for (const file of files) {
                // Encontrar a próxima célula vazia
                while (currentCellToFill < loadedSounds.length && loadedSounds[currentCellToFill] !== null) {
                    currentCellToFill++;
                }

                if (currentCellToFill >= loadedSounds.length) {
                    alert("Todas as células estão preenchidas! Não foi possível carregar todos os sons.");
                    break;
                }

                if (file.type.startsWith('audio/')) {
                    try {
                        const audioBuffer = await decodeAudioFile(file);
                        loadedSounds[currentCellToFill] = audioBuffer;
                        const cell = soundCells[currentCellToFill];
                        updateCellContent(cell, file.name);
                        saveSoundToLocalStorage(currentCellToFill, file, file.name);
                        currentCellToFill++;
                    } catch (error) {
                        alert(`Erro ao carregar ou decodificar o ficheiro ${file.name}.`);
                        console.error(error);
                    }
                } else {
                    alert(`O ficheiro ${file.name} não é um ficheiro de áudio válido e foi ignorado.`);
                }
            }
        };
        fileInput.click();
    });

    // Funções de atualização dos displays
    function updateVolumeDisplay() {
        volumeDisplay.textContent = `${Math.round(volumeRange.value * 100)}%`;
    }

    function updateFadeInDisplay() {
        const val = parseFloat(fadeInRange.value);
        if (val === 0) {
            fadeInDisplay.textContent = `0s (${translations[currentLang].fadeInLabel.split(':')[0]} Imediato)`;
        } else {
            fadeInDisplay.textContent = `${val.toFixed(2)}s`;
        }
    }

    function updateFadeOutDisplay() {
        const val = parseFloat(fadeOutRange.value);
        if (val === 0) {
            fadeoutDisplay.textContent = `0s (${translations[currentLang].fadeOutLabel.split(':')[0]} Imediata)`;
        } else {
            fadeoutDisplay.textContent = `${val.toFixed(2)}s`;
        }
    }

    // Navegação QLab (Espaço e Ctrl+Espaço)
    function navigateQlab(forward) {
        let startIndex = forward ? qlabModeIndex + 1 : qlabModeIndex - 1;

        if (qlabModeIndex === -1 && forward) {
            startIndex = 0; // Se não há som ativo, começa do primeiro
        } else if (qlabModeIndex === -1 && !forward) {
            startIndex = loadedSounds.length - 1; // Se não há som ativo, começa do último
        }

        let nextIndex = -1;

        if (forward) {
            for (let i = startIndex; i < loadedSounds.length; i++) {
                if (loadedSounds[i]) {
                    nextIndex = i;
                    break;
                }
            }
            // Se não encontrou no final, volta ao início (com wrap-around)
            if (nextIndex === -1 && startIndex > 0) { // Se não começou do zero
                for (let i = 0; i < startIndex; i++) {
                    if (loadedSounds[i]) {
                        nextIndex = i;
                        break;
                    }
                }
            }
        } else { // backward
            for (let i = startIndex; i >= 0; i--) {
                if (loadedSounds[i]) {
                    nextIndex = i;
                    break;
                }
            }
            // Se não encontrou no início, volta ao final (com wrap-around)
            if (nextIndex === -1 && startIndex < loadedSounds.length - 1) { // Se não começou do último
                for (let i = loadedSounds.length - 1; i > startIndex; i--) {
                    if (loadedSounds[i]) {
                        nextIndex = i;
                        break;
                    }
                }
            }
        }

        if (nextIndex !== -1) {
            playSound(loadedSounds[nextIndex], nextIndex);
            qlabModeIndex = nextIndex;
        }
    }

    // Funções de Cue
    function toggleCue(index) {
        const cell = soundCells[index];
        if (!cell || !loadedSounds[index]) return; // Só pode cued se tiver som

        if (cuedSounds.has(index)) {
            cuedSounds.delete(index);
            cell.classList.remove('cued');
        } else {
            cuedSounds.add(index);
            cell.classList.add('cued');
        }
        console.log("Sons em cue:", Array.from(cuedSounds));
    }

    function playCuedSounds() {
        cuedSounds.forEach(index => {
            if (loadedSounds[index]) {
                playSound(loadedSounds[index], index);
            }
        });
        cuedSounds.clear(); // Limpa a fila após tocar
        document.querySelectorAll('.sound-cell.cued').forEach(cell => cell.classList.remove('cued'));
    }

    function stopCuedSounds() {
        cuedSounds.forEach(index => {
            stopSoundInCell(index); // Reutiliza a função de parar som em célula
        });
        cuedSounds.clear();
        document.querySelectorAll('.sound-cell.cued').forEach(cell => cell.classList.remove('cued'));
    }

    function removeCues() {
        cuedSounds.clear();
        document.querySelectorAll('.sound-cell.cued').forEach(cell => cell.classList.remove('cued'));
        console.log("Cues removidos.");
    }


    // Event Listeners Globais
    document.addEventListener('keydown', (e) => {
        // Ignorar eventos se um input ou um nome de som estiver em foco
        if (e.target.tagName === 'INPUT' || (e.target.classList && e.target.classList.contains('sound-name'))) {
            return;
        }

        const key = e.key.toLowerCase();
        const index = keyMap[key];

        // Se o popup de confirmação estiver visível
        if (stopConfirmationPopup.classList.contains('visible')) {
            if (e.key === 'Escape') {
                stopConfirmationPopup.classList.remove('visible'); // Fecha o popup sem parar os sons
                e.preventDefault(); // Impede a propagação para evitar parar sons imediatamente após fechar o popup
            } else if (e.key === 'Enter') {
                confirmStopYesButton.click(); // Simula o clique no botão Sim
                e.preventDefault();
            }
            return; // Impede que outras teclas afetem a soundboard enquanto o popup está ativo
        }

        // Lógica para teclas numéricas para Fade Out
        if (!e.ctrlKey && !e.altKey && !e.shiftKey && key.match(/^[0-9]$/)) {
            const fadeValue = parseInt(key);
            fadeOutRange.value = fadeValue;
            updateFadeOutDisplay();
            e.preventDefault();
        }

        // Lógica para Ctrl + teclas numéricas para Fade In
        if (e.ctrlKey && !e.altKey && !e.shiftKey && key.match(/^[0-9]$/)) {
            const fadeValue = parseInt(key);
            fadeInRange.value = fadeValue;
            updateFadeInDisplay();
            e.preventDefault();
        }

        if (index !== undefined && loadedSounds[index]) {
            playSound(loadedSounds[index], index);
            qlabModeIndex = index; // Atualiza o índice para o modo QLab
        } else if (e.key === 'Escape') {
            // Se o popup NÃO estiver visível, então ESC para todos os sons
            // A lógica de popup.classList.contains('visible') acima já gerencia isso.
            stopAllSounds();
            e.preventDefault();
        } else if (e.key === ' ' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            // Barra de Espaços para QLab GO
            e.preventDefault(); // Previne o scroll da página
            navigateQlab(true);
        } else if (e.key === ' ' && e.ctrlKey) {
            // Ctrl + Barra de Espaços para QLab BACK
            e.preventDefault();
            navigateQlab(false);
        } else if (e.key === 'Enter' && e.ctrlKey) {
            // Ctrl + Enter para CUE
            e.preventDefault();
            // Esta combinação de teclas normalmente cue um som.
            // Aqui, vamos assumir que o Ctrl + clique é a forma primária para cue individual.
            // Ctrl + Enter pode ser usado para CUE o próximo som disponível no modo QLab, ou todos, dependendo da sua preferência.
            // Por agora, vamos deixá-lo como um atalho para "cue" uma ação (e.g. cue all, ou cue next Qlab)
            // Se quiser que ele faça cue ao som atual no modo QLab:
            if (qlabModeIndex !== -1 && loadedSounds[qlabModeIndex]) {
                 toggleCue(qlabModeIndex);
            }
        } else if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            // Enter para GO (tocar sons em cue)
            e.preventDefault();
            playCuedSounds();
        } else if (e.key === 'Enter' && e.shiftKey) {
            // Shift + Enter para STOP CUE
            e.preventDefault();
            stopCuedSounds();
        } else if (e.key === 'Enter' && e.altKey) {
            // Alt + Enter para REMOVER CUES (sem parar)
            e.preventDefault();
            removeCues();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            volumeRange.value = Math.min(1, parseFloat(volumeRange.value) + 0.05);
            volumeRange.dispatchEvent(new Event('input')); // Dispara o evento 'input' para atualizar o display e o volume
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            volumeRange.value = Math.max(0, parseFloat(volumeRange.value) - 0.05);
            volumeRange.dispatchEvent(new Event('input'));
        }
    });

    // Event listeners para controles
    volumeRange.addEventListener('input', () => {
        audioContext.listener.gain.value = volumeRange.value; // Isto não é um listener, mas sim o volume global
        // Ajustar o volume de todos os sons que estão a tocar (para os GainNodes existentes)
        Object.values(playingSounds).forEach(sound => {
            if (sound && sound.gainNode) {
                // Parar qualquer rampa de áudio anterior para evitar conflitos
                sound.gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                // Definir o volume imediatamente para a nova posição do slider
                sound.gainNode.gain.setValueAtTime(volumeRange.value, audioContext.currentTime);
            }
        });
        updateVolumeDisplay();
    });

    fadeInRange.addEventListener('input', updateFadeInDisplay);
    fadeOutRange.addEventListener('input', updateFadeOutDisplay);


    // Event Listener para o botão 'Parar Todos os Sons' (AGORA GATILHO PARA POPUP)
    stopAllSoundsButton.addEventListener('click', () => {
        stopConfirmationPopup.classList.add('visible'); // Mostra o popup
    });

    // Event Listener para o botão 'Sim' no popup
    confirmStopYesButton.addEventListener('click', () => {
        stopAllSounds(); // Chama a função existente para parar os sons
        stopConfirmationPopup.classList.remove('visible'); // Esconde o popup
    });

    // Event Listener para o botão 'Não' no popup
    confirmStopNoButton.addEventListener('click', () => {
        stopConfirmationPopup.classList.remove('visible'); // Esconde o popup (não faz nada)
    });

    // Inicialização
    createSoundboard();
    updateVolumeDisplay();
    updateFadeInDisplay();
    updateFadeOutDisplay();
    applyTranslations(); // Aplica as traduções iniciais ao carregar a página
});
