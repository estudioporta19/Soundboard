// js/dbManager.js

window.soundboardApp = window.soundboardApp || {};

window.soundboardApp.dbManager = (function() {
    const DB_NAME = 'SoundboardDB';
    const DB_VERSION = 1;
    const OBJECT_STORE_NAME = 'audioContent'; // Onde vamos guardar os ArrayBuffers de áudio

    let db = null; // A instância do banco de dados

    /**
     * Abre e inicializa o banco de dados IndexedDB.
     * Esta função deve ser chamada no início da aplicação (e.g., em main.js).
     * @returns {Promise<IDBDatabase>} Uma promessa que resolve com a instância do DB.
     */
    function openDb() {
        return new Promise((resolve, reject) => {
            if (db) { // Se já estiver aberto, resolve imediatamente
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                // Este evento é disparado se a versão do DB for maior que a existente
                // ou se o DB não existir. É aqui que criamos/atualizamos object stores.
                const database = event.target.result;
                if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                    database.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
                    // 'id' será o nosso identificador único para cada ArrayBuffer de áudio
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result; // Armazena a instância do DB
                console.log("IndexedDB aberto com sucesso.");
                resolve(db);
            };

            request.onerror = (event) => {
                console.error("Erro ao abrir IndexedDB:", event.target.error);
                // CORRIGIDO: Chamar i18n.getTranslation corretamente
                alert(window.soundboardApp.i18n.getTranslation('alertDbOpenError') + `\nDetalhes: ${event.target.error.message}`);
                reject(event.target.error);
            };
        });
    }

    /**
     * Guarda um ArrayBuffer de áudio no IndexedDB.
     * @param {string} id - Um ID único para o áudio (e.g., UUID, ou hash).
     * @param {ArrayBuffer} audioBuffer - O ArrayBuffer contendo os dados do ficheiro de áudio.
     * @returns {Promise<void>} Uma promessa que resolve quando o áudio é salvo.
     */
    async function saveAudio(id, audioBuffer) {
        try {
            const database = await openDb();
            const transaction = database.transaction([OBJECT_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(OBJECT_STORE_NAME);
            const request = store.put({ id: id, data: audioBuffer }); // 'put' para adicionar ou atualizar

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    // console.log(`Áudio com ID '${id}' salvo no IndexedDB.`);
                    resolve();
                };
                request.onerror = (event) => {
                    console.error(`Erro ao salvar áudio com ID '${id}' no IndexedDB:`, event.target.error);
                    // CORRIGIDO: Chamar i18n.getTranslation corretamente
                    reject(new Error(window.soundboardApp.i18n.getTranslation('alertSaveAudioDbError') + `\nDetalhes: ${event.target.error.message}`));
                };
            });
        } catch (error) {
            console.error("Erro na transação de salvar áudio:", error);
            throw error; // Re-lança o erro para ser tratado a montante
        }
    }

    /**
     * Obtém um ArrayBuffer de áudio do IndexedDB.
     * @param {string} id - O ID único do áudio a obter.
     * @returns {Promise<ArrayBuffer|null>} Uma promessa que resolve com o ArrayBuffer ou null se não for encontrado.
     */
    async function getAudio(id) {
        try {
            const database = await openDb();
            const transaction = database.transaction([OBJECT_STORE_NAME], 'readonly');
            const store = transaction.objectStore(OBJECT_STORE_NAME);
            const request = store.get(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    resolve(request.result ? request.result.data : null);
                };
                request.onerror = (event) => {
                    console.error(`Erro ao obter áudio com ID '${id}' do IndexedDB:`, event.target.error);
                    // CORRIGIDO: Chamar i18n.getTranslation corretamente
                    reject(new Error(window.soundboardApp.i18n.getTranslation('alertGetAudioDbError') + `\nDetalhes: ${event.target.error.message}`));
                };
            });
        } catch (error) {
            console.error("Erro na transação de obter áudio:", error);
            throw error;
        }
    }

    /**
     * Elimina um ArrayBuffer de áudio do IndexedDB.
     * @param {string} id - O ID único do áudio a eliminar.
     * @returns {Promise<void>} Uma promessa que resolve quando o áudio é eliminado.
     */
    async function deleteAudio(id) {
        try {
            const database = await openDb();
            const transaction = database.transaction([OBJECT_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(OBJECT_STORE_NAME);
            const request = store.delete(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    // console.log(`Áudio com ID '${id}' eliminado do IndexedDB.`);
                    resolve();
                };
                request.onerror = (event) => {
                    console.error(`Erro ao eliminar áudio com ID '${id}' do IndexedDB:`, event.target.error);
                    // CORRIGIDO: Chamar i18n.getTranslation corretamente
                    reject(new Error(window.soundboardApp.i18n.getTranslation('alertDeleteAudioDbError') + `\nDetalhes: ${event.target.error.message}`));
                };
            });
        } catch (error) {
            console.error("Erro na transação de eliminar áudio:", error);
            throw error;
        }
    }

    /**
     * Limpa todo o object store de áudio (todos os áudios salvos).
     * @returns {Promise<void>} Uma promessa que resolve quando todos os áudios são eliminados.
     */
    async function clearAllAudio() {
        try {
            const database = await openDb();
            const transaction = database.transaction([OBJECT_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(OBJECT_STORE_NAME);
            const request = store.clear();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log("Todo o áudio limpo do IndexedDB.");
                    resolve();
                };
                request.onerror = (event) => {
                    console.error("Erro ao limpar todo o áudio do IndexedDB:", event.target.error);
                    // CORRIGIDO: Chamar i18n.getTranslation corretamente
                    reject(new Error(window.soundboardApp.i18n.getTranslation('alertClearAllAudioDbError') + `\nDetalhes: ${event.target.error.message}`));
                };
            });
        } catch (error) {
            console.error("Erro na transação de limpar todo o áudio:", error);
            throw error;
        }
    }

    return {
        init: openDb, // Use esta função para garantir que o DB está aberto
        saveAudio: saveAudio,
        getAudio: getAudio,
        deleteAudio: deleteAudio,
        clearAllAudio: clearAllAudio
    };
})();
