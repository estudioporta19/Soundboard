// js/indexedDBManager.js
window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.indexedDBManager = (function() {
    const DB_NAME = 'SoundboardDB';
    const DB_VERSION = 2; // Incremente a versão se alterar o esquema da base de dados
    const STORE_NAME = 'audios';
    let db = null;
    let getTranslation; // Variável para armazenar a função de tradução

    /**
     * Define a função de tradução para ser usada no módulo IndexedDB.
     * Deve ser chamada na inicialização principal da aplicação.
     * @param {Function} translationFunction - A função getTranslation do i18n.
     */
    function setTranslationFunction(translationFunction) {
        getTranslation = translationFunction;
    }

    /**
     * Abre e inicializa a base de dados IndexedDB.
     * @returns {Promise<IDBDatabase>} Uma promessa que resolve com o objeto da base de dados, ou rejeita em caso de erro.
     */
    function openDB() {
        return new Promise((resolve, reject) => {
            if (db) {
                return resolve(db); // Se a DB já estiver aberta, resolve com ela
            }

            console.log("Tentando abrir IndexedDB...");
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`Upgrade necessário ou primeira criação da DB. Versão: ${event.oldVersion} -> ${event.newVersion}`);
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // Cria o object store com 'index' como keyPath
                    db.createObjectStore(STORE_NAME, { keyPath: 'index' });
                    console.log(`Object store '${STORE_NAME}' criado.`);
                }
                // Se houver upgrades futuros, adicione mais if's aqui para manipular as versões
                // Ex: if (event.oldVersion < 2) { /* migração da versão 1 para a 2 */ }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log("IndexedDB aberto com sucesso.");
                db.onversionchange = () => {
                    db.close();
                    alert(getTranslation('alertDbOpenError') + " (A base de dados precisa ser atualizada. Por favor, recarregue a página.)");
                    console.warn("A base de dados foi atualizada em outra aba. Fechando conexão atual.");
                    window.location.reload(); // Recarregar a página para garantir que a nova versão seja carregada
                };
                resolve(db);
            };

            request.onerror = (event) => {
                const errorMessage = getTranslation('alertDbOpenError') + `: ${event.target.error}`;
                console.error("Erro ao abrir IndexedDB:", event.target.error);
                alert(errorMessage);
                reject(event.target.error);
            };
        });
    }

    /**
     * Salva dados de áudio no IndexedDB.
     * @param {number} index - O índice da célula (usado como chave primária).
     * @param {string} audioDataUrl - A Data URL do áudio.
     * @param {string} name - O nome do som.
     * @param {string} key - A tecla associada.
     * @param {string} color - A cor da célula.
     * @param {boolean} isLooping - Se o som deve fazer loop.
     * @param {boolean} isCued - Se o som está 'cued'.
     * @returns {Promise<void>} Uma promessa que resolve quando os dados são guardados, ou rejeita em caso de erro.
     */
    async function saveAudio(index, audioDataUrl, name, key, color, isLooping, isCued) {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const dataToSave = {
                index: index,
                audioDataUrl: audioDataUrl,
                name: name,
                key: key,
                color: color,
                isLooping: isLooping,
                isCued: isCued
            };

            const request = store.put(dataToSave); // 'put' para adicionar ou atualizar

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`Áudio da célula ${index} salvo no IndexedDB.`);
                    resolve();
                };
                request.onerror = (event) => {
                    const errorMessage = getTranslation('alertSaveAudioDbError') + `: ${event.target.error}`;
                    console.error(`Erro ao salvar áudio da célula ${index}:`, event.target.error);
                    alert(errorMessage);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            const errorMessage = getTranslation('alertSaveAudioDbError') + `: ${error.message}`;
            console.error("Erro ao preparar salvamento de áudio no IndexedDB:", error);
            alert(errorMessage);
            throw error; // Propaga o erro
        }
    }

    /**
     * Obtém dados de áudio do IndexedDB pelo índice.
     * @param {number} index - O índice da célula.
     * @returns {Promise<Object|undefined>} Uma promessa que resolve com os dados do áudio, ou undefined se não encontrado, ou rejeita em caso de erro.
     */
    async function getAudio(index) {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(index);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (request.result) {
                        console.log(`Áudio da célula ${index} obtido do IndexedDB.`);
                        resolve(request.result);
                    } else {
                        console.log(`Nenhum áudio encontrado para a célula ${index} no IndexedDB.`);
                        resolve(undefined);
                    }
                };
                request.onerror = (event) => {
                    const errorMessage = getTranslation('alertGetAudioDbError') + `: ${event.target.error}`;
                    console.error(`Erro ao obter áudio da célula ${index}:`, event.target.error);
                    alert(errorMessage);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            const errorMessage = getTranslation('alertGetAudioDbError') + `: ${error.message}`;
            console.error("Erro ao preparar obtenção de áudio do IndexedDB:", error);
            alert(errorMessage);
            throw error; // Propaga o erro
        }
    }

    /**
     * Obtém todos os dados de áudio do IndexedDB.
     * @returns {Promise<Array<Object>>} Uma promessa que resolve com um array de todos os dados de áudio, ou rejeita em caso de erro.
     */
    async function getAllAudios() {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll(); // Pega todos os objetos

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`Todos os áudios obtidos do IndexedDB. Total: ${request.result.length}`);
                    resolve(request.result);
                };
                request.onerror = (event) => {
                    const errorMessage = getTranslation('alertGetAudioDbError') + `: ${event.target.error}`;
                    console.error("Erro ao obter todos os áudios do IndexedDB:", event.target.error);
                    alert(errorMessage);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            const errorMessage = getTranslation('alertGetAudioDbError') + `: ${error.message}`;
            console.error("Erro ao preparar obtenção de todos os áudios do IndexedDB:", error);
            alert(errorMessage);
            throw error; // Propaga o erro
        }
    }

    /**
     * Exclui um item de áudio do IndexedDB pelo índice.
     * @param {number} index - O índice do item a ser excluído.
     * @returns {Promise<void>} Uma promessa que resolve quando o item é excluído, ou rejeita em caso de erro.
     */
    async function deleteAudio(index) {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(index);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`Áudio da célula ${index} removido do IndexedDB.`);
                    resolve();
                };
                request.onerror = (event) => {
                    const errorMessage = getTranslation('alertDeleteAudioDbError') + `: ${event.target.error}`;
                    console.error(`Erro ao eliminar áudio da célula ${index}:`, event.target.error);
                    alert(errorMessage);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            const errorMessage = getTranslation('alertDeleteAudioDbError') + `: ${error.message}`;
            console.error("Erro ao preparar eliminação de áudio no IndexedDB:", error);
            alert(errorMessage);
            throw error; // Propaga o erro
        }
    }

    /**
     * Limpa todo o object store de áudios no IndexedDB.
     * @returns {Promise<void>} Uma promessa que resolve quando o store é limpo, ou rejeita em caso de erro.
     */
    async function clearAllAudios() {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log("Todos os áudios removidos do IndexedDB.");
                    resolve();
                };
                request.onerror = (event) => {
                    const errorMessage = getTranslation('alertClearAllAudioDbError') + `: ${event.target.error}`;
                    console.error("Erro ao limpar todos os áudios do IndexedDB:", event.target.error);
                    alert(errorMessage);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            const errorMessage = getTranslation('alertClearAllAudioDbError') + `: ${error.message}`;
            console.error("Erro ao preparar limpeza de todos os áudios no IndexedDB:", error);
            alert(errorMessage);
            throw error; // Propaga o erro
        }
    }

    return {
        setTranslationFunction: setTranslationFunction,
        openDB: openDB, // Expor para testes ou uso inicial (como no main.js)
        saveAudio: saveAudio,
        getAudio: getAudio,
        getAllAudios: getAllAudios,
        deleteAudio: deleteAudio,
        clearAllAudios: clearAllAudios
    };
})();
